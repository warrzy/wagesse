import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getTruckerProfileId, requireVerifiedPhone, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { consumeCreditForUnlock } from "@/lib/services/credit-service"
import { getUnlockCostCreditsForUser } from "@/lib/services/subscription-service"

/**
 * POST /api/requests/[id]/unlock-customer-contact
 * Trucker unlocks the customer contact info for a request using 1 credit.
 * Stores the unlock so it is never charged twice.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params

    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()

    const truckerId = await getTruckerProfileId(auth.userId)
    if (!truckerId) {
      return NextResponse.json({ error: "Trucker profile not found" }, { status: 404 })
    }

    const transportRequest = await prisma.transportRequest.findFirst({
      where: { id: requestId, status: { not: "DRAFT" }, deletedAt: null },
      select: { id: true, customerId: true },
    })

    if (!transportRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const phoneGate = await requireVerifiedPhone(auth.userId)
    if (phoneGate) return phoneGate

    const unlockCost = await getUnlockCostCreditsForUser(auth.userId)
    const spend = await consumeCreditForUnlock({
      userId: auth.userId,
      requestId,
      amount: unlockCost,
      resolveContacts: async (tx) => {
        const customer = await tx.customerProfile.findUnique({
          where: { id: transportRequest.customerId },
          select: { id: true, user: { select: { phone: true, email: true } } },
        })
        return [
          {
            customerId: transportRequest.customerId,
            phone: customer?.user?.phone,
            email: customer?.user?.email,
          },
        ]
      },
    })

    if (spend.alreadyUnlocked) {
      return NextResponse.json({ success: true, data: { alreadyUnlocked: true } })
    }
    if ("insufficient" in spend && spend.insufficient) {
      return NextResponse.json(
        { success: false, error: "Vous n'avez plus suffisamment de crédits.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      )
    }

    return NextResponse.json({ success: true, data: { alreadyUnlocked: false, unlocked: true } })
  } catch (error: any) {
    console.error("[POST /api/requests/[id]/unlock-customer-contact]", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
