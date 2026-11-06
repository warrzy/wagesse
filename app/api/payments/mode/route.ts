import { NextResponse } from "next/server"
import { getPaymentMode, manualPaymentInstructions } from "@/lib/payment-mode"

export const dynamic = "force-dynamic"

export async function GET() {
  const mode = getPaymentMode()
  return NextResponse.json({
    success: true,
    data: {
      mode,
      instructions: mode === "MANUAL" ? manualPaymentInstructions() : null,
    },
  })
}
