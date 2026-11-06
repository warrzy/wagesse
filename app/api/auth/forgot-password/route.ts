import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { issueOtp } from "@/lib/otp-delivery"

const schema = z.object({
  phone: z.string().regex(/^[0-9]{8,}$/, "Numéro de téléphone invalide"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = schema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const { phone } = validation.data
    const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, status: true, deletedAt: true } })
    if (!user || user.deletedAt || user.status === "DELETED") {
      return NextResponse.json({
        success: true,
        message: "Si ce numéro a un compte, un code a été envoyé.",
      })
    }

    const issued = await issueOtp(phone, "reset")
    if (!issued.ok) {
      return NextResponse.json(
        { success: false, error: "Trop de demandes de code. Réessayez plus tard.", code: "OTP_RATE_LIMIT" },
        { status: 429 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Si ce numéro a un compte, un code a été envoyé.",
      data: {
        smsDelivered: issued.delivered,
        ...(issued.debugOtp ? { debugOtp: issued.debugOtp } : {}),
      },
      ...(issued.debugOtp ? { debugOtp: issued.debugOtp } : {}),
    })
  } catch (error) {
    console.error("Forgot password error:", error instanceof Error ? error.name : "error")
    return NextResponse.json({ success: false, error: "Internal server error", code: "SERVER_ERROR" }, { status: 500 })
  }
}
