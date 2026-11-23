import { NextRequest, NextResponse } from "next/server"
import { assertAuthAttemptAllowed, clearAuthFailure, generateToken, hashPassword, recordAuthFailure, verifyPassword } from "@/lib/auth"
import { findAccountsByIdentifier } from "@/lib/account-directory"
import { writeAudit } from "@/lib/audit"
import { loginSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"

let timingHash: Promise<string> | null = null

function timingPad(password: string) {
  timingHash ??= hashPassword("wagesse-timing-pad")
  return timingHash.then((hash) => verifyPassword(password, hash))
}

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const { phone, identifier, password } = validation.data
    const rawIdentifier = (identifier || phone || "").trim()
    if (!assertAuthAttemptAllowed("login", rawIdentifier).ok) {
      return NextResponse.json(
        { success: false, error: "Trop de tentatives. Réessayez plus tard.", code: "AUTH_RATE_LIMIT" },
        { status: 429 }
      )
    }

    const found = await findAccountsByIdentifier(rawIdentifier)
    if (found.status === "collision") {
      await timingPad(password)
      recordAuthFailure("login", rawIdentifier)
      return NextResponse.json(
        { success: false, error: "Identifiants incorrects", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }
    const user = found.status === "ok" ? found.user : null
    if (!user) {
      await timingPad(password)
      recordAuthFailure("login", rawIdentifier)
      return NextResponse.json(
        { success: false, error: "Identifiants incorrects", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }

    const passwordValid = await verifyPassword(password, user.password)
    if (!passwordValid) {
      recordAuthFailure("login", rawIdentifier)
      const attempts = user.loginAttempts + 1
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: attempts, lockedUntil },
      })
      if (lockedUntil) {
        await writeAudit(user.id, "login_locked", "User", user.id, { attempts })
      }
      return NextResponse.json(
        { success: false, error: "Identifiants incorrects", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { success: false, error: "Compte temporairement verrouillé. Réessayez plus tard.", code: "ACCOUNT_LOCKED" },
        { status: 423 }
      )
    }

    if (user.deletedAt || user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Ce compte n'est pas actif", code: "ACCOUNT_INACTIVE" },
        { status: 403 }
      )
    }

    clearAuthFailure("login", rawIdentifier)

    if (user.passwordMustChange) {
      const expires = user.temporaryPasswordExpiresAt
      if (!expires || expires.getTime() <= Date.now()) {
        return NextResponse.json(
          {
            success: false,
            error: "Ce mot de passe temporaire a expiré. Demandez une nouvelle assistance.",
            code: "TEMP_PASSWORD_EXPIRED",
          },
          { status: 401 }
        )
      }
      const token = generateToken(user.id, user.email, user.role, user.tokenVersion, "password-change")
      return NextResponse.json({
        success: true,
        data: {
          token,
          passwordChangeRequired: true,
          user: {
            id: user.id,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phoneVerified: user.phoneVerified,
          },
        },
        message: "Changez le mot de passe temporaire avant de continuer.",
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginAttempts: 0, lockedUntil: null },
    })

    const token = generateToken(user.id, user.email, user.role, user.tokenVersion)

    return NextResponse.json({
      success: true,
      data: {
        token,
        passwordChangeRequired: false,
        user: {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          phoneVerified: user.phoneVerified,
        },
      },
      message: "Connexion réussie",
    })
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.name : "error")
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
