import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { generateToken, hashPassword, verifyToken } from "@/lib/auth"
import { passwordSchema } from "@/lib/validations"
import { writeAudit } from "@/lib/audit"

const schema = z.object({
  password: passwordSchema,
})

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("Authorization")?.split(" ")[1]
    const decoded = token ? verifyToken(token) : null
    if (!decoded || decoded.purpose !== "password-change") {
      return NextResponse.json(
        { success: false, error: "Cette session ne permet que le changement du mot de passe temporaire.", code: "PASSWORD_CHANGE_REQUIRED" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = schema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user || user.deletedAt || user.status !== "ACTIVE" || user.tokenVersion !== decoded.tokenVersion) {
      return NextResponse.json({ success: false, error: "Session expirée", code: "SESSION_EXPIRED" }, { status: 401 })
    }
    if (!user.passwordMustChange || !user.temporaryPasswordExpiresAt || user.temporaryPasswordExpiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { success: false, error: "Le mot de passe temporaire a expiré.", code: "TEMP_PASSWORD_EXPIRED" },
        { status: 401 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(validation.data.password),
        passwordMustChange: false,
        temporaryPasswordExpiresAt: null,
        tokenVersion: { increment: 1 },
        loginAttempts: 0,
        lockedUntil: null,
      },
    })
    await writeAudit(user.id, "password_changed", "User", user.id, { forced: true })

    return NextResponse.json({
      success: true,
      data: {
        token: generateToken(updated.id, updated.email, updated.role, updated.tokenVersion),
        user: {
          id: updated.id,
          phone: updated.phone,
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.role,
          phoneVerified: updated.phoneVerified,
        },
      },
      message: "Mot de passe mis à jour.",
    })
  } catch (error) {
    console.error("Change password error:", error instanceof Error ? error.name : "error")
    return NextResponse.json({ success: false, error: "Internal server error", code: "SERVER_ERROR" }, { status: 500 })
  }
}
