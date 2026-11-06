import { prisma } from "@/lib/prisma"

export type CreditTransactionType =
  | "PURCHASE"
  | "UNLOCK_CONTACT"
  | "SUBSCRIPTION_MONTHLY_TOPUP"
  | "ADMIN_ADJUSTMENT"
  | "PROMO"

function creditDb() {
  return prisma as any
}

export async function getOrCreateWallet(userId: string) {
  const db = creditDb()
  const existing = await db.creditWallet.findUnique({ where: { userId } })
  if (existing) return existing
  return await db.creditWallet.create({
    data: {
      userId,
      balance: 0,
      purchasedBalance: 0,
      subscriptionBalance: 0,
      subscriptionBalanceExpiresAt: null,
    },
  })
}

async function normalizeWalletForExpiry(tx: any, wallet: any) {
  const expiresAt: Date | null = wallet.subscriptionBalanceExpiresAt
  if (expiresAt && expiresAt.getTime() <= Date.now() && wallet.subscriptionBalance > 0) {
    const purchased = wallet.purchasedBalance ?? 0
    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        subscriptionBalance: 0,
        subscriptionBalanceExpiresAt: null,
        balance: purchased,
      },
    })
    return updated
  }
  return wallet
}

export async function getCreditBalances(userId: string): Promise<{
  total: number
  purchased: number
  subscription: number
  subscriptionExpiresAt: Date | null
}> {
  const db = creditDb()
  const wallet = await getOrCreateWallet(userId)

  const expiresAt: Date | null = wallet.subscriptionBalanceExpiresAt
  const subscriptionValid = !expiresAt || expiresAt.getTime() > Date.now()
  const purchased = wallet.purchasedBalance ?? wallet.balance ?? 0
  const subscription = subscriptionValid ? wallet.subscriptionBalance ?? 0 : 0
  const total = purchased + subscription

  return {
    total,
    purchased,
    subscription,
    subscriptionExpiresAt: subscriptionValid ? expiresAt : null,
  }
}

export async function getCreditBalance(userId: string): Promise<number> {
  const b = await getCreditBalances(userId)
  return b.total
}

export async function spendCredit(params: {
  userId: string
  amount: number
  type: CreditTransactionType
  metadata?: Record<string, unknown>
}) {
  const { userId, amount, type, metadata } = params
  if (amount <= 0) throw new Error("Invalid amount")

  const db = creditDb()

  return await db.$transaction(async (tx: any) => {
    const initialWallet = await tx.creditWallet.upsert({
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

    const wallet = await normalizeWalletForExpiry(tx, initialWallet)

    const purchased = wallet.purchasedBalance ?? 0
    const subscription = wallet.subscriptionBalance ?? 0
    const total = purchased + subscription

    if (total < amount) {
      return { success: false as const, wallet }
    }

    const subscriptionSpend = Math.min(subscription, amount)
    const remaining = amount - subscriptionSpend
    const purchasedSpend = remaining

    const newSubscriptionBalance = subscription - subscriptionSpend
    const newPurchasedBalance = purchased - purchasedSpend
    const newBalance = newSubscriptionBalance + newPurchasedBalance

    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        subscriptionBalance: newSubscriptionBalance,
        purchasedBalance: newPurchasedBalance,
        balance: newBalance,
      },
    })

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: -amount,
        balanceAfter: newBalance,
        metadata: (metadata ?? undefined) as any,
      },
    })

    return { success: true as const, wallet: updated }
  })
}

async function lockWallet(tx: any, walletId: string) {
  await tx.$queryRaw`SELECT id FROM CreditWallet WHERE id = ${walletId} FOR UPDATE`
  return tx.creditWallet.findUnique({ where: { id: walletId } })
}

export async function grantPurchasedCredits(
  tx: any,
  params: {
    userId: string
    credits: number
    idempotencyKey: string
    metadata?: Record<string, unknown>
  }
) {
  const { userId, credits, idempotencyKey, metadata } = params
  if (!idempotencyKey) throw new Error("Clé d'idempotence manquante")
  if (credits <= 0) throw new Error("Invalid amount")

  const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey } })
  if (existing) return { alreadyApplied: true as const }

  const initial = await tx.creditWallet.upsert({
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
  const locked = await lockWallet(tx, initial.id)
  const again = await tx.creditTransaction.findUnique({ where: { idempotencyKey } })
  if (again) return { alreadyApplied: true as const }

  const wallet = await normalizeWalletForExpiry(tx, locked)
  const purchased = wallet.purchasedBalance ?? 0
  const subscription = wallet.subscriptionBalance ?? 0
  const newPurchased = purchased + credits
  const newBalance = newPurchased + subscription

  await tx.creditWallet.update({
    where: { id: wallet.id },
    data: { purchasedBalance: newPurchased, balance: newBalance },
  })

  await tx.creditTransaction.create({
    data: {
      walletId: wallet.id,
      type: "PURCHASE",
      amount: credits,
      balanceAfter: newBalance,
      idempotencyKey,
      metadata: (metadata ?? undefined) as any,
    },
  })

  return { alreadyApplied: false as const, balance: newBalance }
}

export async function adjustPurchasedCredits(params: {
  userId: string
  amount: number
  reason: string
  actorId: string
  idempotencyKey: string
}) {
  const { userId, amount, reason, actorId, idempotencyKey } = params
  if (!Number.isInteger(amount) || amount === 0) throw new Error("Montant invalide")
  if (!reason || reason.trim().length < 5) throw new Error("Une justification est requise")

  const db = creditDb()
  return db.$transaction(async (tx: any) => {
    const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey } })
    if (existing) return { alreadyApplied: true as const, wallet: null }

    const initial = await tx.creditWallet.upsert({
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
    const locked = await lockWallet(tx, initial.id)
    const wallet = await normalizeWalletForExpiry(tx, locked)
    const purchased = wallet.purchasedBalance ?? 0
    const subscription = wallet.subscriptionBalance ?? 0
    if (amount < 0 && purchased + amount < 0) {
      throw new Error("Solde de crédits achetés insuffisant")
    }
    const newPurchased = purchased + amount
    const newBalance = newPurchased + subscription
    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: { purchasedBalance: newPurchased, balance: newBalance },
    })
    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_ADJUSTMENT",
        amount,
        balanceAfter: newBalance,
        idempotencyKey,
        metadata: { reason: reason.trim(), actorId },
      },
    })
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "adjust_credits",
        resource: "CreditWallet",
        resourceId: wallet.id,
        changes: { userId, amount, reason: reason.trim(), idempotencyKey },
      },
    })
    return { alreadyApplied: false as const, wallet: updated }
  })
}

export async function consumeCreditForUnlock(params: {
  userId: string
  requestId: string
  amount: number
  resolveContacts: (tx: any) => Promise<unknown>
}) {
  const { userId, requestId, amount, resolveContacts } = params
  if (amount <= 0) throw new Error("Invalid amount")
  const db = creditDb()

  try {
    return await db.$transaction(async (tx: any) => {
      const existing = await tx.contactUnlock.findUnique({
        where: { requestId_unlockedByUserId: { requestId, unlockedByUserId: userId } },
      })
      if (existing) return { alreadyUnlocked: true as const }

      const initial = await tx.creditWallet.upsert({
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
      const locked = await lockWallet(tx, initial.id)
      const existingAfterLock = await tx.contactUnlock.findUnique({
        where: { requestId_unlockedByUserId: { requestId, unlockedByUserId: userId } },
      })
      if (existingAfterLock) return { alreadyUnlocked: true as const }

      const wallet = await normalizeWalletForExpiry(tx, locked)
      const purchased = wallet.purchasedBalance ?? 0
      const subscription = wallet.subscriptionBalance ?? 0
      const total = purchased + subscription
      if (total < amount) return { alreadyUnlocked: false as const, insufficient: true as const }

      const subscriptionSpend = Math.min(subscription, amount)
      const purchasedSpend = amount - subscriptionSpend
      const newSubscription = subscription - subscriptionSpend
      const newPurchased = purchased - purchasedSpend
      const newBalance = newSubscription + newPurchased

      await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          subscriptionBalance: newSubscription,
          purchasedBalance: newPurchased,
          balance: newBalance,
        },
      })
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: "UNLOCK_CONTACT",
          amount: -amount,
          balanceAfter: newBalance,
          metadata: { requestId },
        },
      })
      const contacts = await resolveContacts(tx)
      await tx.contactUnlock.create({
        data: {
          requestId,
          unlockedByUserId: userId,
          unlockedContacts: contacts as any,
        },
      })
      return { alreadyUnlocked: false as const, insufficient: false as const, unlocked: true as const }
    })
  } catch (error: any) {
    if (error?.code === "P2002") return { alreadyUnlocked: true as const }
    throw error
  }
}
