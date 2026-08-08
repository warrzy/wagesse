import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfWeek(d: Date) {
  const x = startOfDay(d)
  const day = x.getDay() // 0 sunday
  const diff = (day + 6) % 7 // monday=0
  x.setDate(x.getDate() - diff)
  return x
}

function startOfMonth(d: Date) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

type ActivityItem = {
  at: string
  type: string
  label: string
  userId?: string
  userPhone?: string
  resourceId?: string
  status?: string
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const now = new Date()
    const today = startOfDay(now)
    const week = startOfWeek(now)
    const month = startOfMonth(now)

    const [
      usersTotal,
      usersToday,
      usersWeek,
      usersMonth,

      truckerTotal,
      truckerVerified,
      truckerPending,

      suspendedUsers,

      requestsTotal,
      requestsToday,
      requestGroup,

      quotesTotal,
      quoteGroup,

      missionsTotal,
      missionsCompleted,

      paymentsTotal,
      paymentsAgg,

      subscriptionsTotal,
      subscriptionTierGroup,

      creditTxTotal,
      creditTxGroup,

      recentUsers,
      recentRequests,
      recentQuotes,
      recentPayments,
      recentSubs,
      recentCreditTx,
      recentUnlocks,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: week } } }),
      prisma.user.count({ where: { deletedAt: null, createdAt: { gte: month } } }),

      prisma.truckerProfile.count({ where: { deletedAt: null } }),
      prisma.truckerProfile.count({ where: { deletedAt: null, verificationStatus: "VERIFIED" as any } }),
      prisma.truckerProfile.count({ where: { deletedAt: null, verificationStatus: "PENDING" as any } }),

      prisma.user.count({ where: { status: "SUSPENDED" } }),

      prisma.transportRequest.count({ where: { deletedAt: null } }),
      prisma.transportRequest.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
      prisma.transportRequest.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),

      prisma.quote.count({}),
      prisma.quote.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      prisma.mission.count({}),
      prisma.mission.count({ where: { status: "COMPLETED" as any } }),

      prisma.payment.count({}),
      prisma.payment.groupBy({
        by: ["type"],
        _count: { _all: true },
        _sum: { amount: true },
      }),

      prisma.subscription.count({}),
      prisma.subscriptionPlan.groupBy({
        by: ["tier"],
        where: { isActive: true },
        _count: { _all: true },
      }),

      prisma.creditTransaction.count({}),
      prisma.creditTransaction.groupBy({
        by: ["type"],
        _count: { _all: true },
      }),

      prisma.user.findMany({
        where: { deletedAt: null },
        select: { id: true, phone: true, createdAt: true, role: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.transportRequest.findMany({
        where: { deletedAt: null },
        select: { id: true, createdAt: true, status: true, customer: { select: { user: { select: { id: true, phone: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.quote.findMany({
        select: { id: true, createdAt: true, status: true, trucker: { select: { user: { select: { id: true, phone: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.payment.findMany({
        select: { id: true, initiatedAt: true, status: true, type: true, payer: true, amount: true },
        orderBy: { initiatedAt: "desc" },
        take: 10,
      }),
      prisma.subscription.findMany({
        select: {
          id: true,
          createdAt: true,
          status: true,
          plan: { select: { tier: true, name: true } },
          customer: { select: { user: { select: { id: true, phone: true } } } },
          trucker: { select: { user: { select: { id: true, phone: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.creditTransaction.findMany({
        select: {
          id: true,
          createdAt: true,
          type: true,
          amount: true,
          wallet: { select: { user: { select: { id: true, phone: true } } } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.contactUnlock.findMany({
        select: {
          id: true,
          createdAt: true,
          requestId: true,
          unlockedByUser: { select: { id: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ])

    const requestByStatus: Record<string, number> = {}
    for (const row of requestGroup) requestByStatus[String(row.status)] = row._count._all

    const quoteByStatus: Record<string, number> = {}
    for (const row of quoteGroup) quoteByStatus[String(row.status)] = row._count._all

    const paymentsByType: Record<string, { count: number; amount: number }> = {}
    for (const row of paymentsAgg) {
      paymentsByType[String(row.type)] = {
        count: row._count._all,
        amount: Number(row._sum.amount ?? 0),
      }
    }

    const subscriptionByTier: Record<string, number> = {}
    for (const row of subscriptionTierGroup) subscriptionByTier[String(row.tier)] = row._count._all

    const creditByType: Record<string, number> = {}
    for (const row of creditTxGroup) creditByType[String(row.type)] = row._count._all

    const paymentsTotalAmount = Object.values(paymentsByType).reduce((sum, v) => sum + (v.amount || 0), 0)

    const activity: ActivityItem[] = []

    for (const u of recentUsers) {
      activity.push({
        at: u.createdAt.toISOString(),
        type: "USER_CREATED",
        label: "Nouveau compte créé",
        userId: u.id,
        userPhone: u.phone,
        resourceId: u.id,
        status: String(u.role),
      })
    }

    for (const r of recentRequests) {
      activity.push({
        at: r.createdAt.toISOString(),
        type: "REQUEST_CREATED",
        label: "Nouvelle annonce créée",
        userId: r.customer?.user?.id,
        userPhone: r.customer?.user?.phone,
        resourceId: r.id,
        status: String(r.status),
      })
    }

    for (const q of recentQuotes) {
      activity.push({
        at: q.createdAt.toISOString(),
        type: "QUOTE_CREATED",
        label: "Nouvelle offre déposée",
        userId: q.trucker?.user?.id,
        userPhone: q.trucker?.user?.phone,
        resourceId: q.id,
        status: String(q.status),
      })
    }

    for (const p of recentPayments) {
      activity.push({
        at: p.initiatedAt.toISOString(),
        type: "PAYMENT_EVENT",
        label: "Paiement",
        userId: p.payer,
        resourceId: p.id,
        status: `${p.type}:${p.status}`,
      })
    }

    for (const s of recentSubs) {
      const subscriber = s.customer?.user ?? s.trucker?.user
      activity.push({
        at: s.createdAt.toISOString(),
        type: "SUBSCRIPTION_EVENT",
        label: `Abonnement ${s.plan?.tier ?? ""} ${s.status}`.trim(),
        userId: subscriber?.id,
        userPhone: subscriber?.phone,
        resourceId: s.id,
        status: String(s.status),
      })
    }

    for (const ct of recentCreditTx) {
      activity.push({
        at: ct.createdAt.toISOString(),
        type: "CREDIT_TRANSACTION",
        label: `Transaction crédits (${ct.type})`,
        userId: ct.wallet?.user?.id,
        userPhone: ct.wallet?.user?.phone,
        resourceId: ct.id,
        status: String(ct.amount),
      })
    }

    for (const u of recentUnlocks) {
      activity.push({
        at: u.createdAt.toISOString(),
        type: "CONTACT_UNLOCK",
        label: "Contact débloqué",
        userId: u.unlockedByUser?.id,
        userPhone: u.unlockedByUser?.phone,
        resourceId: u.requestId,
      })
    }

    activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    const kpis = {
      users: {
        total: usersTotal,
        newToday: usersToday,
        newWeek: usersWeek,
        newMonth: usersMonth,
      },
      truckers: {
        total: truckerTotal,
        verified: truckerVerified,
        pending: truckerPending,
        suspended: suspendedUsers,
      },
      requests: {
        total: requestsTotal,
        today: requestsToday,
        byStatus: requestByStatus,
      },
      quotes: {
        total: quotesTotal,
        byStatus: quoteByStatus,
      },
      missions: {
        total: missionsTotal,
        completed: missionsCompleted,
      },
      payments: {
        total: paymentsTotal,
        totalAmount: paymentsTotalAmount,
        byType: paymentsByType,
      },
      subscriptions: {
        total: subscriptionsTotal,
        byTier: subscriptionByTier,
      },
      credits: {
        transactions: creditTxTotal,
        byType: creditByType,
      },
    }

    return NextResponse.json({ success: true, data: { kpis, activity: activity.slice(0, 30) } })
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
