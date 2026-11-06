import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, requireVerifiedPhone, unauthorized } from "@/lib/api-auth"
import { paymentServiceLayer } from "@/lib/services/payment-service"
import { commercialOrderService } from "@/lib/services/commercial-order-service"
import { getPaymentMode } from "@/lib/payment-mode"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/credits/purchase
 * MANUAL : enregistre une commande en attente, sans attribuer de crédits.
 * PAYDUNYA ou PROVIDER : initialise un paiement provider. L'attribution
 * n'a lieu qu'après vérification serveur du statut.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()

    const phoneGate = await requireVerifiedPhone(auth.userId)
    if (phoneGate) return phoneGate

    const body = await request.json()
    const packCode = String(body?.packCode || "")
    const phoneNumber = body?.phoneNumber ? String(body.phoneNumber) : undefined
    const paymentMethod = body?.paymentMethod ? String(body.paymentMethod) : "orange_money"

    if (!packCode) {
      return NextResponse.json({ success: false, error: "packCode manquant" }, { status: 400 })
    }

    const mode = getPaymentMode()
    if (mode === "MANUAL") {
      const order = await commercialOrderService.createCreditPackOrder(auth.userId, packCode)
      return NextResponse.json(
        {
          success: true,
          data: {
            order,
            redirectUrl: `/dashboard/commandes/${order.id}`,
            instructions: order.paymentInstructions,
          },
        },
        { status: 201 }
      )
    }

    const db = prisma as any
    const pack = await db.creditPack.findUnique({ where: { code: packCode } })
    if (!pack || !pack.isActive) {
      return NextResponse.json({ success: false, error: "Pack indisponible" }, { status: 404 })
    }

    const customerId = await getCustomerProfileId(auth.userId)
    const truckerId = await getTruckerProfileId(auth.userId)
    const { searchParams } = new URL(request.url)
    const returnTo = searchParams.get("returnTo") || (truckerId ? "/dashboard/trucker" : "/dashboard/client")

    const result = await paymentServiceLayer.initialize(
      auth.userId,
      customerId,
      {
        amount: pack.priceXof,
        type: "CREDIT_PURCHASE" as any,
        paymentMethod: (mode === "PAYDUNYA" ? "paydunya" : paymentMethod) as any,
        phoneNumber,
        currency: "XOF",
      } as any,
      { credits: pack.credits, packCode: pack.code },
      returnTo
    )

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: any) {
    if (error?.message === "PACK_UNAVAILABLE") {
      return NextResponse.json({ success: false, error: "Pack indisponible" }, { status: 404 })
    }
    if (error?.message === "PAYDUNYA_DISABLED") {
      return NextResponse.json({ success: false, error: "PayDunya n'est pas activé" }, { status: 403 })
    }
    console.error("[POST /api/credits/purchase]", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
