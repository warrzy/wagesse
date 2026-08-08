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

    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        payer: true,
        customerId: true,
        amount: true,
        currency: true,
        type: true,
        description: true,
        reference: true,
        providerName: true,
        providerReference: true,
        status: true,
        platformFee: true,
        providerFee: true,
        missionId: true,
        metadata: true,
        initiatedAt: true,
        confirmedAt: true,
        failedAt: true,
        expiresAt: true,
        lastAttemptAt: true,
        customer: {
          select: {
            id: true,
            city: true,
            user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
          },
        },
        mission: {
          select: {
            id: true,
            missionReference: true,
            status: true,
            requestId: true,
            createdAt: true,
            contractPrice: true,
            contractCurrency: true,
            platformCommission: true,
            platformCommissionRate: true,
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
            trucker: {
              select: {
                id: true,
                verificationStatus: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
              },
            },
            customer: {
              select: {
                id: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
              },
            },
          },
        },
        subscriptionPayment: {
          select: {
            id: true,
            subscriptionId: true,
            amount: true,
            currency: true,
            status: true,
            paymentMethod: true,
            transactionRef: true,
            providerRef: true,
            paidAt: true,
            failureReason: true,
            subscription: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                customerId: true,
                truckerId: true,
                plan: { select: { id: true, name: true, tier: true, code: true } },
              },
            },
          },
        },
        attempts: {
          orderBy: { attemptedAt: "desc" },
          take: 20,
          select: {
            id: true,
            attemptNumber: true,
            status: true,
            errorCode: true,
            errorMessage: true,
            attemptedAt: true,
          },
        },
        refunds: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, amount: true, currency: true, reason: true, status: true, createdAt: true },
        },
      },
    })

    if (!payment) {
      return NextResponse.json({ success: false, error: "Paiement introuvable" }, { status: 404 })
    }

    const payerUser = await prisma.user.findUnique({
      where: { id: payment.payer },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true },
    })

    return NextResponse.json({ success: true, data: { ...payment, payerUser } })
  } catch (error) {
    console.error("[GET /api/admin/paiements/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
