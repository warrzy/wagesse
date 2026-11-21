import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getTruckerProfileId, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/requests/[id]/unlock-customer-contact
 * Les coordonnées du client sont transmises après acceptation du devis.
 * Cet appel ne débite aucun crédit.
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
      select: {
        id: true,
        customer: { select: { user: { select: { phone: true, email: true } } } },
      },
    })
    if (!transportRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    const accepted = await prisma.quote.findFirst({
      where: { requestId, truckerId, status: "ACCEPTED" },
      select: { id: true },
    })
    const mission = accepted
      ? null
      : await prisma.mission.findFirst({ where: { requestId, truckerId }, select: { id: true } })

    if (!accepted && !mission) {
      return NextResponse.json(
        {
          success: false,
          error: "Les coordonnées sont transmises lorsque le client accepte votre devis.",
          code: "CONTACT_AFTER_ACCEPTANCE",
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        charged: false,
        phone: transportRequest.customer.user.phone,
        email: transportRequest.customer.user.email,
      },
    })
  } catch (error: any) {
    console.error("[POST /api/requests/[id]/unlock-customer-contact]", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
