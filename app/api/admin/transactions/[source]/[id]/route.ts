import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string; id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { source, id } = await params

    if (source === "CreditTransaction") {
      const row = await prisma.creditTransaction.findUnique({
        where: { id },
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
              id: true,
              userId: true,
              balance: true,
              purchasedBalance: true,
              subscriptionBalance: true,
              user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
            },
          },
        },
      })

      if (!row) return NextResponse.json({ success: false, error: "Transaction crédit introuvable" }, { status: 404 })
      return NextResponse.json({ success: true, data: { source, row } })
    }

    if (source === "Commission") {
      const row = await prisma.commission.findUnique({
        where: { id },
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
          mission: {
            select: {
              id: true,
              missionReference: true,
              status: true,
              createdAt: true,
              requestId: true,
              payment: { select: { id: true, reference: true, status: true, amount: true, currency: true, providerName: true } },
              request: {
                select: {
                  id: true,
                  pickupCity: true,
                  dropoffCity: true,
                  quantity: true,
                  unit: true,
                  materialDescription: true,
                  material: { select: { id: true, name: true } },
                  status: true,
                },
              },
            },
          },
          trucker: {
            select: {
              id: true,
              city: true,
              verificationStatus: true,
              userId: true,
              user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
            },
          },
        },
      })

      if (!row) return NextResponse.json({ success: false, error: "Commission introuvable" }, { status: 404 })
      return NextResponse.json({ success: true, data: { source, row } })
    }

    if (source === "Payout") {
      const row = await prisma.payout.findUnique({
        where: { id },
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
              city: true,
              verificationStatus: true,
              userId: true,
              user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
            },
          },
        },
      })

      if (!row) return NextResponse.json({ success: false, error: "Payout introuvable" }, { status: 404 })
      return NextResponse.json({ success: true, data: { source, row } })
    }

    return NextResponse.json(
      { success: false, error: "Source inconnue" },
      { status: 400 }
    )
  } catch (error) {
    console.error("[GET /api/admin/transactions/[source]/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
