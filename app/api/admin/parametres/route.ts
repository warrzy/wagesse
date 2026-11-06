import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdminRole, unauthorized } from "@/lib/api-auth"
import { getPaymentMode } from "@/lib/payment-mode"
import { smsStatus } from "@/lib/sms"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isAdminRole(auth.role)) return unauthorized("Forbidden")

  const sms = smsStatus()
  return NextResponse.json({
    success: true,
    data: {
      paymentMode: getPaymentMode(),
      paydunyaEnabled: process.env.PAYDUNYA_ENABLED === "true",
      smsProvider: sms.provider,
      smsConfigured: sms.configured,
      smsSimulation: sms.simulation,
    },
  })
}
