import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getTruckerProfileId, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { spendCredit } from "@/lib/services/credit-service"
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

    const auth = getAuthContext(request)
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

    const existingUnlock = await prisma.contactUnlock.findFirst({
      where: { requestId, unlockedByUserId: auth.userId },
      select: { id: true },
    })

    if (existingUnlock) {
      return NextResponse.json({ success: true, data: { alreadyUnlocked: true } })
    }

    const unlockCost = await getUnlockCostCreditsForUser(auth.userId)

    const spend = await spendCredit({
      userId: auth.userId,
      amount: unlockCost,
      type: "UNLOCK_CONTACT",
      metadata: { requestId },
    })

    if (!spend.success) {
      return NextResponse.json(
        { success: false, error: "Vous n'avez plus suffisamment de crédits.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      )
    }

    const customer = await prisma.customerProfile.findUnique({
      where: { id: transportRequest.customerId },
      select: { id: true, user: { select: { id: true, phone: true, email: true, firstName: true, lastName: true } } },
    })

    await prisma.contactUnlock.create({
      data: {
        requestId,
        unlockedByUserId: auth.userId,
        unlockedContacts: [
          {
            customerId: transportRequest.customerId,
            phone: customer?.user?.phone,
            email: customer?.user?.email,
          },
        ],
      },
    })

    return NextResponse.json({ success: true, data: { alreadyUnlocked: false, unlocked: true } })
  } catch (error: any) {
    console.error("[POST /api/requests/[id]/unlock-customer-contact]", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
