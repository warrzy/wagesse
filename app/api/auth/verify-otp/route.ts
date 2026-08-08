import { NextRequest, NextResponse } from "next/server"
import { verifyOTP } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^[0-9]{8,}$/, "Numéro de téléphone invalide"),
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
})

// POST /api/auth/verify-otp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = verifyOtpSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const { phone, code } = validation.data

    const isValid = verifyOTP(phone, code)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Code invalide ou expiré", code: "INVALID_OTP" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur introuvable", code: "USER_NOT_FOUND" },
        { status: 404 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: "Numéro de téléphone vérifié",
    })
  } catch (error) {
    console.error("Verify OTP error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
