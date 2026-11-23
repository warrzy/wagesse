import { NextResponse } from "next/server"
import { recoveryChannel } from "@/lib/recovery-policy"
import { smsConfigured } from "@/lib/sms"
import { smtpConfigured } from "@/lib/mail"

export async function GET() {
  const channel = recoveryChannel()
  return NextResponse.json({
    success: true,
    data: {
      channel,
      smsConfigured: smsConfigured(),
      smtpConfigured: smtpConfigured(),
      automaticDelivery: channel !== "admin" && ((channel === "sms" && smsConfigured()) || (channel === "smtp" && smtpConfigured())),
    },
  })
}
