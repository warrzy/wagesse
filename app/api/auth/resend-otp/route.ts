import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertOtpSendAllowed, exposeOtpForTests, generateOTP, recordOtpSend, storeOTP } from "@/lib/auth"

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
    const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, phoneVerified: true } })
    if (!user) {
      return NextResponse.json({ success: true, message: "Si ce numéro existe, un code a été préparé." })
    }
    if (user.phoneVerified) {
      return NextResponse.json({ success: true, message: "Ce numéro est déjà vérifié." })
    }

    const allowed = assertOtpSendAllowed(phone)
    if (!allowed.ok) {
      return NextResponse.json(
        { success: false, error: "Trop de demandes de code. Réessayez plus tard.", code: "OTP_RATE_LIMIT" },
        { status: 429 }
      )
    }

    const otp = generateOTP()
    storeOTP(phone, otp)
    recordOtpSend(phone)
    const debugOtp = exposeOtpForTests(otp)

    return NextResponse.json({
      success: true,
      message: "Un nouveau code a été préparé.",
      ...(debugOtp ? { debugOtp } : {}),
    })
  } catch (error) {
    console.error("Resend OTP error:", error)
    return NextResponse.json({ success: false, error: "Internal server error", code: "SERVER_ERROR" }, { status: 500 })
  }
}
