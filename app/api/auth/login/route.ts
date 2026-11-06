import { NextRequest, NextResponse } from "next/server"
import { verifyPassword, generateToken } from "@/lib/auth"
import { loginSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"

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

    const { phone, password } = validation.data

    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Identifiants incorrects", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Ce compte n'est pas actif", code: "ACCOUNT_INACTIVE" },
        { status: 403 }
      )
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { success: false, error: "Compte temporairement verrouillé. Réessayez plus tard.", code: "ACCOUNT_LOCKED" },
        { status: 423 }
      )
    }

    const passwordValid = await verifyPassword(password, user.password)
    if (!passwordValid) {
      const attempts = user.loginAttempts + 1
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      })
      return NextResponse.json(
        { success: false, error: "Identifiants incorrects", code: "INVALID_CREDENTIALS" },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginAttempts: 0, lockedUntil: null },
    })

    const token = generateToken(user.id, user.email, user.role)

    return NextResponse.json({
      success: true,
      data: {
        token,
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
    console.error("Login error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
