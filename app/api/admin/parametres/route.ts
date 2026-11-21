import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdminRole, isSuperAdmin, unauthorized } from "@/lib/api-auth"
import { getPaymentMode } from "@/lib/payment-mode"
import { smsStatus } from "@/lib/sms"
import { readQuoteCreditCost, writeQuoteCreditCost } from "@/lib/services/quote-credit"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isAdminRole(auth.role)) return unauthorized("Forbidden")

  const sms = smsStatus()
  const quoteCreditCost = await readQuoteCreditCost()
  return NextResponse.json({
    success: true,
    data: {
      paymentMode: getPaymentMode(),
      paydunyaEnabled: process.env.PAYDUNYA_ENABLED === "true",
      smsProvider: sms.provider,
      smsConfigured: sms.configured,
      smsSimulation: sms.simulation,
      quoteCreditCost,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isSuperAdmin(auth.role)) {
    return NextResponse.json(
      { success: false, error: "Seul le super administrateur peut modifier le coût d'un devis.", code: "SUPER_ADMIN_REQUIRED" },
      { status: 403 }
    )
  }
  const body = await request.json().catch(() => ({}))
  try {
    const quoteCreditCost = await writeQuoteCreditCost(Number(body?.quoteCreditCost), auth.userId)
    return NextResponse.json({ success: true, data: { quoteCreditCost } })
  } catch (error: any) {
    if (error?.message === "INVALID_QUOTE_COST") {
      return NextResponse.json(
        { success: false, error: "Le coût d'un devis doit être un entier entre 1 et 100." },
        { status: 400 }
      )
    }
    console.error("[POST /api/admin/parametres]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
