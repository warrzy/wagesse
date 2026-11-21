import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getCustomerProfileId, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/requests/[id]/unlock-contacts
 * Le client consulte ses devis sans crédit. Aucun débit n'est effectué.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()

    const customerId = await getCustomerProfileId(auth.userId)
    if (!customerId) {
      return NextResponse.json({ error: "Customer profile not found" }, { status: 404 })
    }

    const transportRequest = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
      select: { id: true },
    })
    if (!transportRequest) {
      return NextResponse.json({ error: "Request not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { alreadyUnlocked: true, charged: false },
    })
  } catch (error: any) {
    console.error("[POST /api/requests/[id]/unlock-contacts]", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
