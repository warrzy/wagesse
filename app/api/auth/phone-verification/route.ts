import { NextResponse } from "next/server"
import { phoneVerificationStatus } from "@/lib/phone-policy"

export const dynamic = "force-dynamic"

/** Public mode flag. It does not accept a client override and exposes no secret. */
export async function GET() {
  return NextResponse.json({ success: true, data: phoneVerificationStatus() })
}
