import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getCustomerProfileId, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { paymentServiceLayer } from "@/lib/services/payment-service"

/**
 * POST /api/subscription/purchase
 * Initialize a subscription purchase payment. On success, redirects to provider URL
 * (or sandbox confirm screen).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()

    const body = await request.json()
    const planCode = String(body?.planCode || "")
    const phoneNumber = body?.phoneNumber ? String(body.phoneNumber) : undefined
    const paymentMethod = body?.paymentMethod ? String(body.paymentMethod) : "orange_money"

    if (!planCode) {
      return NextResponse.json({ success: false, error: "planCode manquant" }, { status: 400 })
    }

    const db = prisma as any
    const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } })
    if (!plan || !plan.isActive || plan.archivedAt) {
      return NextResponse.json({ success: false, error: "Plan indisponible" }, { status: 404 })
    }

    const amount = Number(plan.monthlyPrice || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Ce plan ne peut pas être payé (prix invalide)." },
        { status: 400 }
      )
    }

    const customerId = await getCustomerProfileId(auth.userId)

    const { searchParams } = new URL(request.url)
    const returnTo = searchParams.get("returnTo") || "/abonnement"

    const result = await paymentServiceLayer.initialize(
      auth.userId,
      customerId,
      {
        amount,
        type: "SUBSCRIPTION" as any,
        paymentMethod: paymentMethod as any,
        phoneNumber,
        currency: String(plan.currency || "XOF"),
      } as any,
      { planCode: plan.code },
      returnTo
    )

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: any) {
    console.error("[POST /api/subscription/purchase]", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
