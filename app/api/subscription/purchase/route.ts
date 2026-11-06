import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getCustomerProfileId, requireVerifiedPhone, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { paymentServiceLayer } from "@/lib/services/payment-service"
import { commercialOrderService } from "@/lib/services/commercial-order-service"
import { getPaymentMode } from "@/lib/payment-mode"

/**
 * POST /api/subscription/purchase
 * En mode MANUAL, crée une commande en attente. Le forfait n'est pas activé.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()

    const phoneGate = await requireVerifiedPhone(auth.userId)
    if (phoneGate) return phoneGate

    const body = await request.json()
    const planCode = String(body?.planCode || "")
    const phoneNumber = body?.phoneNumber ? String(body.phoneNumber) : undefined
    const paymentMethod = body?.paymentMethod ? String(body.paymentMethod) : "orange_money"

    if (!planCode) {
      return NextResponse.json({ success: false, error: "planCode manquant" }, { status: 400 })
    }

    const mode = getPaymentMode()
    if (mode === "MANUAL") {
      const order = await commercialOrderService.createSubscriptionOrder(auth.userId, planCode)
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
        paymentMethod: (mode === "PAYDUNYA" ? "paydunya" : paymentMethod) as any,
        phoneNumber,
        currency: String(plan.currency || "XOF"),
      } as any,
      { planCode: plan.code },
      returnTo
    )

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error: any) {
    if (error?.message === "PLAN_UNAVAILABLE") {
      return NextResponse.json({ success: false, error: "Plan indisponible" }, { status: 404 })
    }
    if (error?.message === "PLAN_NOT_PAID") {
      return NextResponse.json({ success: false, error: "Ce plan ne peut pas être payé (prix invalide)." }, { status: 400 })
    }
    if (error?.message === "PAYDUNYA_DISABLED") {
      return NextResponse.json({ success: false, error: "PayDunya n'est pas activé" }, { status: 403 })
    }
    console.error("[POST /api/subscription/purchase]", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
