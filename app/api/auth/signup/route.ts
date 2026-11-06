import { NextRequest, NextResponse } from "next/server"
import { hashPassword, generateToken, generateOTP, storeOTP, assertOtpSendAllowed, recordOtpSend, exposeOtpForTests } from "@/lib/auth"
import { signupSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = signupSchema.safeParse(body)
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

    const data = validation.data
    const email = `${data.phone}@wagesse.local`

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ phone: data.phone }, { email }] },
    })
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Un compte existe déjà avec ce numéro de téléphone",
          code: "USER_EXISTS",
        },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(data.password)

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          phone: data.phone,
          password: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        },
      })

      if (data.role === "CLIENT") {
        await tx.customerProfile.create({
          data: {
            userId: createdUser.id,
            city: "Ouagadougou",
          },
        })
      } else if (data.role === "TRUCKER") {
        await tx.truckerProfile.create({
          data: {
            userId: createdUser.id,
            city: "Ouagadougou",
            truckerType: "INDEPENDENT_DRIVER",
          },
        })
      }

      return createdUser
    })

    const send = assertOtpSendAllowed(data.phone)
    if (!send.ok) {
      return NextResponse.json(
        { success: false, error: "Trop de demandes de code. Réessayez plus tard.", code: "OTP_RATE_LIMIT" },
        { status: 429 }
      )
    }
    const otp = generateOTP()
    storeOTP(data.phone, otp)
    recordOtpSend(data.phone)
    const debugOtp = exposeOtpForTests(otp)

    const token = generateToken(user.id, user.email, user.role)

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          phoneVerificationRequired: true,
          ...(debugOtp ? { debugOtp } : {}),
          user: {
            id: user.id,
            phone: user.phone,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            phoneVerified: user.phoneVerified,
          },
        },
        message: "Inscription réussie. Vérifiez votre numéro pour les opérations payantes.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    )
  }
}
