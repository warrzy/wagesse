import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPassword, verifyOTP } from "@/lib/auth"
import { otpKey } from "@/lib/otp-delivery"
import { passwordSchema } from "@/lib/validations"

const schema = z.object({
  phone: z.string().regex(/^[0-9]{8,}$/, "Numéro de téléphone invalide"),
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
  password: passwordSchema,
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

    const { phone, code, password } = validation.data
    const check = verifyOTP(otpKey(phone, "reset"), code)
    if (!check.ok) {
      const locked = check.reason === "locked"
      return NextResponse.json(
        {
          success: false,
          error: locked ? "Trop de tentatives. Demandez un nouveau code plus tard." : "Code invalide ou expiré",
          code: locked ? "OTP_LOCKED" : "INVALID_OTP",
        },
        { status: locked ? 429 : 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user || user.deletedAt || user.status === "DELETED") {
      return NextResponse.json({ success: false, error: "Compte introuvable", code: "NOT_FOUND" }, { status: 404 })
    }
    if (!user.phoneVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Le numéro n'a pas été vérifié. La réinitialisation par SMS est refusée.",
          code: "PHONE_NOT_VERIFIED",
        },
        { status: 403 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(password),
        loginAttempts: 0,
        lockedUntil: null,
      },
    })

    return NextResponse.json({ success: true, message: "Mot de passe mis à jour. Vous pouvez vous connecter." })
  } catch (error) {
    console.error("Reset password error:", error instanceof Error ? error.name : "error")
    return NextResponse.json({ success: false, error: "Internal server error", code: "SERVER_ERROR" }, { status: 500 })
  }
}
