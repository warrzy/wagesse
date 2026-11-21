import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { hashPassword } from "@/lib/auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const role = (searchParams.get("role") || "").trim()
    const status = (searchParams.get("status") || "").trim()

    const createdFrom = (searchParams.get("createdFrom") || "").trim()
    const createdTo = (searchParams.get("createdTo") || "").trim()

    const sort = (searchParams.get("sort") || "createdAt_desc").trim()

    const where: any = {
      deletedAt: null,
    }

    if (role) where.role = role
    if (status) where.status = status

    if (createdFrom || createdTo) {
      where.createdAt = {}
      if (createdFrom) where.createdAt.gte = new Date(createdFrom)
      if (createdTo) {
        const d = new Date(createdTo)
        d.setHours(23, 59, 59, 999)
        where.createdAt.lte = d
      }
    }

    if (q) {
      where.OR = [
        { id: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
      ]
    }

    const orderBy: any[] = []
    if (sort === "createdAt_asc") orderBy.push({ createdAt: "asc" })
    else if (sort === "lastLogin_desc") orderBy.push({ lastLoginAt: "desc" })
    else if (sort === "lastLogin_asc") orderBy.push({ lastLoginAt: "asc" })
    else if (sort === "role_asc") orderBy.push({ role: "asc" })
    else if (sort === "role_desc") orderBy.push({ role: "desc" })
    else orderBy.push({ createdAt: "desc" })

    orderBy.push({ id: "desc" })

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          customerProfile: { select: { id: true, totalRequests: true } },
          truckerProfile: { select: { id: true, totalMissions: true, verificationStatus: true } },
          creditWallet: { select: { balance: true, purchasedBalance: true, subscriptionBalance: true } },
        },
      }),
    ])

    const userIds = items.map((u) => u.id)

    const [truckerProfiles, wallets, quoteCounts, paymentCounts] = await Promise.all([
      prisma.truckerProfile.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      }),
      prisma.creditWallet.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true },
      }),
      prisma.quote.groupBy({
        by: ["truckerId"],
        where: { trucker: { userId: { in: userIds } } },
        _count: { _all: true },
      }),
      prisma.payment.groupBy({
        by: ["payer"],
        where: { payer: { in: userIds } },
        _count: { _all: true },
      }),
    ])

    const userIdByTruckerId: Record<string, string> = {}
    for (const t of truckerProfiles) userIdByTruckerId[t.id] = t.userId

    const userIdByWalletId: Record<string, string> = {}
    for (const w of wallets) userIdByWalletId[w.id] = w.userId

    const quotesByUser: Record<string, number> = {}
    for (const r of quoteCounts) {
      const userId = userIdByTruckerId[String(r.truckerId)]
      if (!userId) continue
      quotesByUser[userId] = (quotesByUser[userId] || 0) + r._count._all
    }

    const paymentsByUser: Record<string, number> = {}
    for (const r of paymentCounts) paymentsByUser[String(r.payer)] = r._count._all

    const enriched = items.map((u) => ({
      ...u,
      stats: {
        requests: u.customerProfile?.totalRequests ?? 0,
        missions: u.truckerProfile?.totalMissions ?? 0,
        quotes: quotesByUser[u.id] ?? 0,
        payments: paymentsByUser[u.id] ?? 0,
      },
    }))

    return NextResponse.json({
      success: true,
      data: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        items: enriched,
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/utilisateurs]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Payload invalide" }, { status: 400 })
    }

    const email = String((body as any).email || "").trim().toLowerCase()
    const phone = String((body as any).phone || "").trim()
    const password = String((body as any).password || "")
    const firstName = ((body as any).firstName ?? null) === null ? null : String((body as any).firstName || "").trim() || null
    const lastName = ((body as any).lastName ?? null) === null ? null : String((body as any).lastName || "").trim() || null
    const role = String((body as any).role || "CLIENT").trim()
    const status = String((body as any).status || "ACTIVE").trim()

    if (!email || !phone || !password) {
      return NextResponse.json(
        { success: false, error: "Champs requis: email, phone, password" },
        { status: 400 }
      )
    }

    if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/.test(password)) {
      return NextResponse.json({ success: false, error: "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre" }, { status: 400 })
    }

    const hashed = await hashPassword(password)

    const created = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashed,
        firstName,
        lastName,
        role: role as any,
        status: status as any,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        deletedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error: any) {
    const msg = String(error?.message || "")
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { success: false, error: "Email ou téléphone déjà utilisé" },
        { status: 409 }
      )
    }

    console.error("[POST /api/admin/utilisateurs]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
