import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getAuthContext, isAdminRole, unauthorized } from "@/lib/api-auth"
import { hashPassword } from "@/lib/auth"
import { writeAudit } from "@/lib/audit"
import { findAccountsByIdentifier } from "@/lib/account-directory"
import { passwordResetDecision } from "@/lib/password-reset-policy"
import { generateTemporaryPassword, TEMP_PASSWORD_TTL_MS } from "@/lib/temporary-password"

const schema = z.object({
  identifier: z.string().min(3),
  confirm: z.literal(true),
  identityDoubt: z.boolean().optional(),
  identityMethod: z.string().optional(),
  identityNote: z.string().optional(),
  confirmationPhrase: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isAdminRole(auth.role)) return unauthorized("Forbidden")

  const identifier = new URL(request.url).searchParams.get("identifier") || ""
  const found = await findAccountsByIdentifier(identifier)
  if (found.status !== "ok" || !found.user || found.user.deletedAt) {
    return NextResponse.json({ success: false, error: "Aucun compte ne correspond à cet identifiant.", code: "NOT_FOUND" }, { status: 404 })
  }
  const user = found.user
  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      phoneVerified: Boolean(user.phoneVerified),
      passwordMustChange: user.passwordMustChange,
      temporaryPasswordActive: Boolean(user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt.getTime() > Date.now()),
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdminRole(auth.role)) {
      return NextResponse.json(
        { success: false, error: "Cette opération est réservée à un administrateur habilité.", code: "FORBIDDEN" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = schema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Confirmez explicitement la réinitialisation.", code: "CONFIRMATION_REQUIRED" },
        { status: 400 }
      )
    }
    const data = validation.data
    const found = await findAccountsByIdentifier(data.identifier)
    if (found.status === "collision") {
      return NextResponse.json(
        { success: false, error: "Plusieurs comptes correspondent. Aucune réinitialisation n'est faite.", code: "IDENTIFIER_COLLISION" },
        { status: 409 }
      )
    }
    if (found.status !== "ok" || !found.user || found.user.deletedAt || found.user.status === "DELETED") {
      return NextResponse.json({ success: false, error: "Aucun compte ne correspond à cet identifiant.", code: "NOT_FOUND" }, { status: 404 })
    }
    const user = found.user
    const decision = passwordResetDecision({
      actorRole: auth.role,
      targetRole: user.role,
      confirm: data.confirm,
      identityDoubt: data.identityDoubt === true,
      identityMethod: data.identityMethod,
      identityNote: data.identityNote,
      confirmationPhrase: data.confirmationPhrase,
    })
    if (!decision.ok) {
      return NextResponse.json({ success: false, error: decision.error, code: decision.code }, { status: decision.status })
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await prisma.auditLog.count({
      where: { action: "password_reset_admin", resourceId: user.id, createdAt: { gte: since } },
    })
    if (recent >= 3 || (user.passwordMustChange && user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt.getTime() > Date.now())) {
      return NextResponse.json(
        { success: false, error: "Une réinitialisation est déjà en cours ou la limite journalière est atteinte.", code: "RESET_LIMIT" },
        { status: 429 }
      )
    }

    const temporaryPassword = generateTemporaryPassword()
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_MS)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(temporaryPassword),
        passwordMustChange: true,
        temporaryPasswordExpiresAt: expiresAt,
        tokenVersion: { increment: 1 },
        loginAttempts: 0,
        lockedUntil: null,
      },
    })
    const identityNote = (data.identityNote || "").trim().slice(0, 500).split(temporaryPassword).join("[retiré]")
    await writeAudit(auth.userId, "password_reset_admin", "User", user.id, {
      actorRole: auth.role,
      targetRole: user.role,
      identityMethod: data.identityMethod,
      identityNote,
      sessionsInvalidated: true,
      expiresAt: expiresAt.toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        role: user.role,
        expiresAt: expiresAt.toISOString(),
        temporaryPassword,
        delivery: "manual",
      },
      message: "Communiquez ce mot de passe par un canal déjà vérifié. Il expire dans 30 minutes et doit être changé à la première connexion.",
    })
  } catch (error) {
    console.error("Admin password reset error:", error instanceof Error ? error.name : "error")
    return NextResponse.json({ success: false, error: "Internal server error", code: "SERVER_ERROR" }, { status: 500 })
  }
}
