import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { paymentServiceLayer } from "@/lib/services/payment-service"

/**
 * POST /api/credits/purchase
 * Initialize a credit-pack purchase. On success, redirects to provider URL
 * (or sandbox confirm screen).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()

    const body = await request.json()
    const packCode = String(body?.packCode || "")
    const phoneNumber = body?.phoneNumber ? String(body.phoneNumber) : undefined
    const paymentMethod = body?.paymentMethod ? String(body.paymentMethod) : "orange_money"

    if (!packCode) {
      return NextResponse.json({ success: false, error: "packCode manquant" }, { status: 400 })
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
        paymentMethod: paymentMethod as any,
        phoneNumber,
        currency: "XOF",
      } as any,
      { credits: pack.credits, packCode: pack.code },
      returnTo
    )

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: any) {
    console.error("[POST /api/credits/purchase]", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
