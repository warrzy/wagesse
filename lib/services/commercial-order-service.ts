import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { generateReference } from "@/lib/auth"
import { manualPaymentInstructions } from "@/lib/payment-mode"
import { grantPurchasedCredits } from "@/lib/services/credit-service"
import { activateOrRenewSubscription } from "@/lib/services/subscription-service"

function benefitsOf(value: unknown): Prisma.InputJsonValue {
  if (Array.isArray(value)) return value as Prisma.InputJsonValue
  return []
}

function fit(value: string, max = 191) {
  const text = value.replace(/\s+/g, " ").trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

async function notify(
  tx: Prisma.TransactionClient,
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
  type: "PAYMENT_CONFIRMED" | "SYSTEM_ALERT" = "SYSTEM_ALERT"
) {
  await tx.notification.create({
    data: {
      userId,
      type,
      title: fit(title),
      message: fit(message),
      actionUrl,
      read: false,
    },
  })
}

async function notifyAdmins(tx: Prisma.TransactionClient, title: string, message: string, actionUrl: string) {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
    select: { id: true },
  })
  for (const admin of admins) {
    await tx.notification.create({
      data: {
        userId: admin.id,
        type: "SYSTEM_ALERT",
        title: fit(title),
        message: fit(message),
        actionUrl,
        read: false,
      },
    })
  }
}

export const commercialOrderService = {
  async createCreditPackOrder(userId: string, packCode: string) {
    const pack = await prisma.creditPack.findUnique({ where: { code: packCode } })
    if (!pack || !pack.isActive) throw new Error("PACK_UNAVAILABLE")
    if (pack.priceXof <= 0 || pack.credits <= 0) throw new Error("PACK_INVALID")

    const instructions = manualPaymentInstructions()
    return prisma.$transaction(async (tx) => {
      const order = await tx.commercialOrder.create({
        data: {
          reference: generateReference("CMD"),
          userId,
          kind: "CREDIT_PACK",
          status: "PENDING",
          offerCode: pack.code,
          title: pack.title,
          amountXof: pack.priceXof,
          currency: "XOF",
          credits: pack.credits,
          monthlyBoosts: 0,
          benefits: [],
          badge: pack.badge,
          paymentInstructions: instructions,
        },
      })
      await tx.commercialOrderEvent.create({
        data: { orderId: order.id, action: "CREATED", actorId: userId, note: "Demande enregistrée" },
      })
      await notify(
        tx,
        userId,
        "Demande de règlement enregistrée",
        `Référence ${order.reference}. Consultez les instructions de règlement. Rien n'est attribué avant validation.`,
        `/dashboard/commandes/${order.id}`
      )
      await notifyAdmins(
        tx,
        "Nouvelle commande en attente",
        `${order.reference} — ${order.title} — ${order.amountXof} XOF`,
        `/admin/commandes/${order.id}`
      )
      return order
    })
  },

  async createSubscriptionOrder(userId: string, planCode: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } })
    if (!plan || !plan.isActive || plan.archivedAt) throw new Error("PLAN_UNAVAILABLE")
    const amount = Number(plan.monthlyPrice || 0)
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("PLAN_NOT_PAID")

    const instructions = manualPaymentInstructions()
    return prisma.$transaction(async (tx) => {
      const order = await tx.commercialOrder.create({
        data: {
          reference: generateReference("CMD"),
          userId,
          kind: "SUBSCRIPTION",
          status: "PENDING",
          offerCode: plan.code || planCode,
          title: plan.name,
          amountXof: Math.round(amount),
          currency: plan.currency || "XOF",
          credits: plan.monthlyCredits ?? 0,
          monthlyBoosts: plan.monthlyBoosts ?? 0,
          unlockCostCredits: plan.unlockCostCredits,
          cycleDays: plan.cycleDays,
          benefits: benefitsOf(plan.benefits),
          badge: plan.badge,
          paymentInstructions: instructions,
        },
      })
      await tx.commercialOrderEvent.create({
        data: { orderId: order.id, action: "CREATED", actorId: userId, note: "Demande enregistrée" },
      })
      await notify(
        tx,
        userId,
        "Demande de règlement enregistrée",
        `Référence ${order.reference}. Consultez les instructions de règlement. Rien n'est attribué avant validation.`,
        `/dashboard/commandes/${order.id}`
      )
      await notifyAdmins(
        tx,
        "Nouvelle commande en attente",
        `${order.reference} — ${order.title} — ${order.amountXof} XOF`,
        `/admin/commandes/${order.id}`
      )
      return order
    })
  },

  async listForUser(userId: string) {
    return prisma.commercialOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { events: { orderBy: { createdAt: "asc" } } },
    })
  },

  async getForUser(orderId: string, userId: string) {
    return prisma.commercialOrder.findFirst({
      where: { id: orderId, userId },
      include: { events: { orderBy: { createdAt: "asc" } } },
    })
  },

  async adminList(params: { q?: string; status?: string; kind?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20))
    const where: Prisma.CommercialOrderWhereInput = {}
    const statuses = new Set(["PENDING", "APPROVED", "REJECTED"])
    const kinds = new Set(["CREDIT_PACK", "SUBSCRIPTION"])
    if (params.status && statuses.has(params.status)) {
      where.status = params.status as Prisma.CommercialOrderWhereInput["status"]
    }
    if (params.kind && kinds.has(params.kind)) {
      where.kind = params.kind as Prisma.CommercialOrderWhereInput["kind"]
    }
    if (params.q) {
      const q = params.q.trim()
      where.OR = [
        { reference: { contains: q } },
        { offerCode: { contains: q } },
        { title: { contains: q } },
        { user: { phone: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.commercialOrder.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
        },
      }),
      prisma.commercialOrder.count({ where }),
    ])

    return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), items }
  },

  async adminGet(orderId: string) {
    return prisma.commercialOrder.findUnique({
      where: { id: orderId },
      include: {
        events: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
      },
    })
  },

  async approve(orderId: string, actorId: string, note?: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.commercialOrder.findUnique({ where: { id: orderId } })
      if (!order) throw new Error("ORDER_NOT_FOUND")
      if (order.status !== "PENDING") return { order, alreadyProcessed: true as const }

      const claimed = await tx.commercialOrder.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: "APPROVED",
          decidedById: actorId,
          decidedAt: new Date(),
          appliedAt: new Date(),
          decisionNote: note?.trim() || null,
        },
      })
      if (claimed.count !== 1) {
        const current = await tx.commercialOrder.findUnique({ where: { id: orderId } })
        return { order: current, alreadyProcessed: true as const }
      }

      const idempotencyKey = `order:${order.id}`
      if (order.kind === "CREDIT_PACK") {
        await grantPurchasedCredits(tx, {
          userId: order.userId,
          credits: order.credits,
          idempotencyKey,
          metadata: { commercialOrderId: order.id, packCode: order.offerCode },
        })
      } else {
        await activateOrRenewSubscription({
          userId: order.userId,
          planCode: order.offerCode,
          idempotencyKey,
          tx,
          credits: order.credits,
          cycleDays: order.cycleDays ?? undefined,
          requireActivePlan: false,
        })
      }

      const customer = await tx.customerProfile.findUnique({ where: { userId: order.userId }, select: { id: true } })
      await tx.payment.create({
        data: {
          payer: order.userId,
          customerId: customer?.id,
          amount: order.amountXof,
          currency: order.currency,
          type: order.kind === "CREDIT_PACK" ? "CREDIT_PURCHASE" : "SUBSCRIPTION",
          reference: order.reference,
          providerName: "manual",
          status: "SUCCESSFUL",
          confirmedAt: new Date(),
          description: order.title,
          metadata: {
            commercialOrderId: order.id,
            credits: order.credits,
            offerCode: order.offerCode,
          },
        },
      })

      await tx.commercialOrderEvent.create({
        data: { orderId: order.id, action: "APPROVED", actorId, note: note?.trim() || "Règlement confirmé" },
      })
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "approve_order",
          resource: "CommercialOrder",
          resourceId: order.id,
          changes: { status: "APPROVED", reference: order.reference, amountXof: order.amountXof, credits: order.credits },
        },
      })
      await notify(
        tx,
        order.userId,
        "Commande approuvée",
        `La commande ${order.reference} est approuvée. Les droits associés ont été attribués.`,
        `/dashboard/commandes/${order.id}`,
        "PAYMENT_CONFIRMED"
      )

      const updated = await tx.commercialOrder.findUnique({ where: { id: order.id } })
      return { order: updated, alreadyProcessed: false as const }
    })
  },

  async reject(orderId: string, actorId: string, note: string) {
    const reason = note?.trim()
    if (!reason || reason.length < 3) throw new Error("NOTE_REQUIRED")

    return prisma.$transaction(async (tx) => {
      const order = await tx.commercialOrder.findUnique({ where: { id: orderId } })
      if (!order) throw new Error("ORDER_NOT_FOUND")
      if (order.status !== "PENDING") return { order, alreadyProcessed: true as const }

      const claimed = await tx.commercialOrder.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: "REJECTED",
          decidedById: actorId,
          decidedAt: new Date(),
          decisionNote: reason,
        },
      })
      if (claimed.count !== 1) {
        const current = await tx.commercialOrder.findUnique({ where: { id: orderId } })
        return { order: current, alreadyProcessed: true as const }
      }

      await tx.commercialOrderEvent.create({
        data: { orderId: order.id, action: "REJECTED", actorId, note: reason },
      })
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "reject_order",
          resource: "CommercialOrder",
          resourceId: order.id,
          changes: { status: "REJECTED", reference: order.reference, note: reason },
        },
      })
      await notify(
        tx,
        order.userId,
        "Commande refusée",
        `La commande ${order.reference} a été refusée. ${reason}`,
        `/dashboard/commandes/${order.id}`
      )
      const updated = await tx.commercialOrder.findUnique({ where: { id: order.id } })
      return { order: updated, alreadyProcessed: false as const }
    })
  },
}
