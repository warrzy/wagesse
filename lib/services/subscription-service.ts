import { prisma } from "@/lib/prisma"

function db() {
  return prisma as any
}

export type SubscriptionPlanCode = "FREE" | "PRO" | "BUSINESS"

export async function getSubscriptionPlans() {
  const d = db()
  const plans = await d.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPrice: "asc" } })
  return plans
}

export async function getActiveSubscriptionForUser(userId: string) {
  const d = db()
  const customer = await d.customerProfile.findUnique({ where: { userId }, select: { id: true } })
  const trucker = await d.truckerProfile.findUnique({ where: { userId }, select: { id: true } })

  const where = customer
    ? { customerId: customer.id, status: "ACTIVE" }
    : trucker
      ? { truckerId: trucker.id, status: "ACTIVE" }
      : null

  if (!where) return null

  return await d.subscription.findFirst({
    where,
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function getUnlockCostCreditsForUser(userId: string): Promise<number> {
  try {
    const sub = await getActiveSubscriptionForUser(userId)
    const cost = sub?.plan?.unlockCostCredits
    if (typeof cost === "number" && cost > 0) return cost
  } catch {
    // ignore
  }
  return 1
}

export async function topupSubscriptionCredits(params: {
  userId: string
  subscriptionId: string
  planId: string
  cycleStart: Date
  cycleEnd: Date
  credits: number
  idempotencyKey?: string
  tx?: any
}) {
  const { userId, subscriptionId, planId, cycleStart, cycleEnd, credits, idempotencyKey } = params
  const run = async (tx: any) => {
    if (idempotencyKey) {
      const byKey = await tx.creditTransaction.findUnique({ where: { idempotencyKey } })
      if (byKey) return { alreadyApplied: true as const }
    }

    const wallet = await tx.creditWallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        balance: 0,
        purchasedBalance: 0,
        subscriptionBalance: 0,
        subscriptionBalanceExpiresAt: null,
      },
    })

    await tx.$queryRaw`SELECT id FROM CreditWallet WHERE id = ${wallet.id} FOR UPDATE`
    if (idempotencyKey) {
      const byKey = await tx.creditTransaction.findUnique({ where: { idempotencyKey } })
      if (byKey) return { alreadyApplied: true as const }
    }

    const locked = await tx.creditWallet.findUnique({ where: { id: wallet.id } })
    const currentCycleKey = `${cycleStart.toISOString()}_${cycleEnd.toISOString()}`
    if (!idempotencyKey) {
      const existing = await tx.creditTransaction.findFirst({
        where: {
          walletId: wallet.id,
          type: "SUBSCRIPTION_MONTHLY_TOPUP",
          metadata: { path: ["subscriptionId"], equals: subscriptionId },
        } as any,
        orderBy: { createdAt: "desc" },
      })
      const existingCycleKey = (existing?.metadata as any)?.cycleKey
      if (existing && existingCycleKey === currentCycleKey) {
        return { alreadyApplied: true as const }
      }
    }

    const purchased = locked.purchasedBalance ?? locked.balance ?? 0
    const newSubscription = credits
    const newBalance = purchased + newSubscription

    await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        subscriptionBalance: newSubscription,
        subscriptionBalanceExpiresAt: cycleEnd,
        balance: newBalance,
      },
    })

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: "SUBSCRIPTION_MONTHLY_TOPUP",
        amount: credits,
        balanceAfter: newBalance,
        idempotencyKey: idempotencyKey || null,
        metadata: {
          subscriptionId,
          planId,
          cycleKey: currentCycleKey,
          cycleStart: cycleStart.toISOString(),
          cycleEnd: cycleEnd.toISOString(),
        },
      },
    })

    return { alreadyApplied: false as const }
  }

  if (params.tx) return run(params.tx)
  return db().$transaction(run)
}

export async function activateOrRenewSubscription(params: {
  userId: string
  planCode: string
  idempotencyKey?: string
  tx?: any
  credits?: number
  cycleDays?: number
  requireActivePlan?: boolean
}) {
  const { userId, planCode, idempotencyKey } = params
  const requireActivePlan = params.requireActivePlan !== false
  const d = db()

  const run = async (tx: any) => {
    if (idempotencyKey) {
      const existingGrant = await tx.creditTransaction.findUnique({ where: { idempotencyKey } })
      if (existingGrant) {
        const customer = await tx.customerProfile.findUnique({ where: { userId }, select: { id: true } })
        const trucker = await tx.truckerProfile.findUnique({ where: { userId }, select: { id: true } })
        const existingSub = customer
          ? await tx.subscription.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } })
          : trucker
            ? await tx.subscription.findFirst({ where: { truckerId: trucker.id }, orderBy: { createdAt: "desc" } })
            : null
        return existingSub
      }
    }

    const plan = await tx.subscriptionPlan.findUnique({ where: { code: planCode } })
    if (!plan || (requireActivePlan && !plan.isActive)) throw new Error("Plan indisponible")

    const customer = await tx.customerProfile.findUnique({ where: { userId }, select: { id: true } })
    const trucker = await tx.truckerProfile.findUnique({ where: { userId }, select: { id: true } })
    if (!customer && !trucker) throw new Error("Profil introuvable")

    const now = new Date()
    const cycleDays =
      typeof params.cycleDays === "number" && params.cycleDays > 0
        ? params.cycleDays
        : typeof plan.cycleDays === "number" && plan.cycleDays > 0
          ? plan.cycleDays
          : 30
    const cycleEnd = new Date(now.getTime() + cycleDays * 24 * 60 * 60 * 1000)
    const credits = typeof params.credits === "number" ? params.credits : (plan.monthlyCredits ?? 0)

    const existing = customer
      ? await tx.subscription.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } })
      : await tx.subscription.findFirst({ where: { truckerId: trucker.id }, orderBy: { createdAt: "desc" } })

    const createdOrUpdated = existing
      ? await tx.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            status: "ACTIVE",
            startDate: now,
            endDate: null,
            nextPaymentDate: cycleEnd,
            lastPaymentDate: now,
            autoRenewal: false,
          },
        })
      : await tx.subscription.create({
          data: {
            customerId: customer?.id,
            truckerId: trucker?.id,
            planId: plan.id,
            status: "ACTIVE",
            startDate: now,
            endDate: null,
            nextPaymentDate: cycleEnd,
            lastPaymentDate: now,
            autoRenewal: false,
          },
        })

    await topupSubscriptionCredits({
      userId,
      subscriptionId: createdOrUpdated.id,
      planId: plan.id,
      cycleStart: now,
      cycleEnd,
      credits,
      idempotencyKey,
      tx,
    })

    return createdOrUpdated
  }

  const subscription = params.tx ? await run(params.tx) : await d.$transaction(run)
  if (!subscription) return null
  if (params.tx) return subscription
  return d.subscription.findUnique({ where: { id: subscription.id }, include: { plan: true } })
}
