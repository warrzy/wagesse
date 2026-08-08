import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

function asNumber(v: string | null) {
  if (v === null || v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function asInt(v: string | null) {
  const n = asNumber(v)
  if (n === null) return null
  return Math.trunc(n)
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 5), 100)

    const q = (searchParams.get("q") || "").trim()

    const category = (searchParams.get("category") || "").trim() // CREDIT | COMMISSION | PAYOUT
    const source = (searchParams.get("source") || "").trim() // CreditTransaction | Commission | Payout

    const subtype = (searchParams.get("subtype") || "").trim() // e.g. PURCHASE, UNLOCK_CONTACT...
    const status = (searchParams.get("status") || "").trim() // mixed

    const userId = (searchParams.get("userId") || "").trim()

    const dateFrom = (searchParams.get("dateFrom") || "").trim()
    const dateTo = (searchParams.get("dateTo") || "").trim()

    const amountMin = asNumber(searchParams.get("amountMin"))
    const amountMax = asNumber(searchParams.get("amountMax"))

    const creditsMin = asInt(searchParams.get("creditsMin"))
    const creditsMax = asInt(searchParams.get("creditsMax"))

    const sort = (searchParams.get("sort") || "date_desc").trim()

    const includeCredit = (!category && !source) || category === "CREDIT" || source === "CreditTransaction"
    const includeCommission = (!category && !source) || category === "COMMISSION" || source === "Commission"
    const includePayout = (!category && !source) || category === "PAYOUT" || source === "Payout"

    const takePerSource = Math.min(pageSize * page, 500)

    const creditWhere: any = {}
    const commissionWhere: any = {}
    const payoutWhere: any = {}

    if (subtype) {
      creditWhere.type = subtype
    }

    if (status) {
      commissionWhere.status = status
      payoutWhere.status = status
    }

    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null
      const to = dateTo ? new Date(dateTo) : null

      if (from || to) {
        creditWhere.createdAt = {}
        commissionWhere.createdAt = {}
        payoutWhere.requestedAt = {}
        if (from) {
          creditWhere.createdAt.gte = from
          commissionWhere.createdAt.gte = from
          payoutWhere.requestedAt.gte = from
        }
        if (to) {
          const d = to
          d.setHours(23, 59, 59, 999)
          creditWhere.createdAt.lte = d
          commissionWhere.createdAt.lte = d
          payoutWhere.requestedAt.lte = d
        }
      }
    }

    if (creditsMin !== null || creditsMax !== null) {
      creditWhere.amount = {}
      if (creditsMin !== null) creditWhere.amount.gte = creditsMin
      if (creditsMax !== null) creditWhere.amount.lte = creditsMax
    }

    if (amountMin !== null || amountMax !== null) {
      commissionWhere.commissionAmount = {}
      payoutWhere.amount = {}
      if (amountMin !== null) {
        commissionWhere.commissionAmount.gte = amountMin
        payoutWhere.amount.gte = amountMin
      }
      if (amountMax !== null) {
        commissionWhere.commissionAmount.lte = amountMax
        payoutWhere.amount.lte = amountMax
      }
    }

    const creditPromise = includeCredit
      ? prisma.creditTransaction.findMany({
          where: creditWhere,
          orderBy: { createdAt: "desc" },
          take: takePerSource,
          select: {
            id: true,
            walletId: true,
            type: true,
            amount: true,
            balanceAfter: true,
            metadata: true,
            createdAt: true,
            wallet: {
              select: {
                userId: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
              },
            },
          },
        })
      : Promise.resolve([])

    const commissionPromise = includeCommission
      ? prisma.commission.findMany({
          where: commissionWhere,
          orderBy: { createdAt: "desc" },
          take: takePerSource,
          select: {
            id: true,
            missionId: true,
            truckerId: true,
            commissionAmount: true,
            commissionRate: true,
            missionAmount: true,
            currency: true,
            status: true,
            createdAt: true,
            paidAt: true,
            mission: { select: { id: true, missionReference: true, status: true, requestId: true, createdAt: true } },
            trucker: {
              select: {
                id: true,
                userId: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
              },
            },
          },
        })
      : Promise.resolve([])

    const payoutPromise = includePayout
      ? prisma.payout.findMany({
          where: payoutWhere,
          orderBy: { requestedAt: "desc" },
          take: takePerSource,
          select: {
            id: true,
            truckerId: true,
            amount: true,
            currency: true,
            paymentMethod: true,
            destination: true,
            status: true,
            transactionId: true,
            errorMessage: true,
            requestedAt: true,
            processedAt: true,
            trucker: {
              select: {
                id: true,
                userId: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
              },
            },
          },
        })
      : Promise.resolve([])

    const [creditRows, commissionRows, payoutRows] = await Promise.all([creditPromise, commissionPromise, payoutPromise])

    type Unified = {
      date: string
      id: string
      reference: string
      user: { id: string; firstName: string | null; lastName: string | null; phone: string; email: string; role: string; status: string } | null
      category: "CREDIT" | "COMMISSION" | "PAYOUT"
      subtype: string
      amountXof: number
      credits: number | null
      status: string
      linkedObject: { kind: string; id: string; label?: string | null } | null
      source: "CreditTransaction" | "Commission" | "Payout"
      sourceId: string
    }

    const unified: Unified[] = []

    for (const r of creditRows as any[]) {
      const user = r.wallet?.user || null
      const reference = `CR-${r.id}`

      unified.push({
        date: r.createdAt.toISOString(),
        id: `CreditTransaction:${r.id}`,
        reference,
        user,
        category: "CREDIT",
        subtype: r.type,
        amountXof: 0,
        credits: r.amount,
        status: r.amount >= 0 ? "CREDIT" : "DEBIT",
        linkedObject: null,
        source: "CreditTransaction",
        sourceId: r.id,
      })
    }

    for (const r of commissionRows as any[]) {
      const user = r.trucker?.user || null
      const reference = `COM-${r.id}`
      const linkedMission = r.mission
        ? { kind: "Mission", id: r.mission.id, label: r.mission.missionReference || r.mission.id }
        : null

      unified.push({
        date: r.createdAt.toISOString(),
        id: `Commission:${r.id}`,
        reference,
        user,
        category: "COMMISSION",
        subtype: "MISSION_COMMISSION",
        amountXof: r.commissionAmount,
        credits: null,
        status: r.status,
        linkedObject: linkedMission,
        source: "Commission",
        sourceId: r.id,
      })
    }

    for (const r of payoutRows as any[]) {
      const user = r.trucker?.user || null
      const reference = `PAY-${r.id}`

      unified.push({
        date: r.requestedAt.toISOString(),
        id: `Payout:${r.id}`,
        reference,
        user,
        category: "PAYOUT",
        subtype: r.paymentMethod,
        amountXof: r.amount,
        credits: null,
        status: r.status,
        linkedObject: r.transactionId ? { kind: "Transaction", id: r.transactionId } : null,
        source: "Payout",
        sourceId: r.id,
      })
    }

    let filtered = unified

    if (userId) {
      filtered = filtered.filter((x) => x.user?.id === userId)
    }

    if (q) {
      const qq = q.toLowerCase()
      filtered = filtered.filter((x) => {
        if (x.id.toLowerCase().includes(qq)) return true
        if (x.reference.toLowerCase().includes(qq)) return true
        if (x.sourceId.toLowerCase().includes(qq)) return true
        if (x.user?.phone?.toLowerCase().includes(qq)) return true
        if (x.user?.email?.toLowerCase().includes(qq)) return true
        const name = `${x.user?.firstName || ""} ${x.user?.lastName || ""}`.toLowerCase()
        if (name.includes(qq)) return true
        if (x.linkedObject?.id?.toLowerCase().includes(qq)) return true
        if ((x.linkedObject?.label || "").toLowerCase().includes(qq)) return true
        return false
      })
    }

    if (category) {
      filtered = filtered.filter((x) => x.category === category)
    }

    if (source) {
      filtered = filtered.filter((x) => x.source === source)
    }

    if (subtype) {
      filtered = filtered.filter((x) => x.subtype === subtype)
    }

    if (status) {
      filtered = filtered.filter((x) => x.status === status)
    }

    filtered.sort((a, b) => {
      const da = new Date(a.date).getTime()
      const db = new Date(b.date).getTime()
      if (sort === "date_asc") return da - db
      return db - da
    })

    const total = filtered.length
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return NextResponse.json({
      success: true,
      data: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        items,
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/transactions]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
