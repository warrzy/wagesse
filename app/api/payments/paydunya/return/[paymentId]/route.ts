import { NextRequest, NextResponse } from "next/server"
import { paymentServiceLayer } from "@/lib/services/payment-service"

function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard/client"
  return raw
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"))
  try {
    await paymentServiceLayer.finalizePaydunya(paymentId)
  } catch (error) {
    console.error("[GET /api/payments/paydunya/return]", error)
  }
  return NextResponse.redirect(new URL(returnTo, request.url))
}
