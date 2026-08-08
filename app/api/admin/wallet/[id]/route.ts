import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const wallet = await prisma.creditWallet.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        balance: true,
        purchasedBalance: true,
        subscriptionBalance: true,
        subscriptionBalanceExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 100,
          select: { id: true, type: true, amount: true, balanceAfter: true, createdAt: true, metadata: true },
        },
      },
    })

    if (!wallet) {
      return NextResponse.json({ success: false, error: "Wallet introuvable" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: wallet })
  } catch (error) {
    console.error("[GET /api/admin/wallet/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
