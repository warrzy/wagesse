import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

function toInt(s: string | null, fallback: number) {
  const n = parseInt(s || "", 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(toInt(searchParams.get("page"), 1), 1)
    const pageSize = Math.min(Math.max(toInt(searchParams.get("pageSize"), 20), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const balanceMin = searchParams.get("balanceMin")
    const balanceMax = searchParams.get("balanceMax")

    const sort = (searchParams.get("sort") || "updatedAt_desc").trim()

    const where: any = {}

    if (q) {
      where.OR = [
        { id: { contains: q } },
        { userId: { contains: q } },
        { user: { phone: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
      ]
    }

    const min = balanceMin ? Number(balanceMin) : null
    const max = balanceMax ? Number(balanceMax) : null
    if (min !== null || max !== null) {
      where.balance = {}
      if (min !== null && Number.isFinite(min)) where.balance.gte = min
      if (max !== null && Number.isFinite(max)) where.balance.lte = max
    }

    const orderBy: any = (() => {
      const [field, dir] = sort.split("_")
      const direction = dir === "asc" ? "asc" : "desc"

      if (field === "balance") return { balance: direction }
      if (field === "purchasedBalance") return { purchasedBalance: direction }
      if (field === "subscriptionBalance") return { subscriptionBalance: direction }
      if (field === "createdAt") return { createdAt: direction }
      return { updatedAt: direction }
    })()

    const [total, wallets] = await Promise.all([
      prisma.creditWallet.count({ where }),
      prisma.creditWallet.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          balance: true,
          purchasedBalance: true,
          subscriptionBalance: true,
          subscriptionBalanceExpiresAt: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
          _count: { select: { transactions: true } },
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        items: wallets,
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/wallet]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
