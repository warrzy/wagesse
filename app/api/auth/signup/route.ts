import { NextRequest, NextResponse } from "next/server"
import { hashPassword, generateToken } from "@/lib/auth"
import { signupSchema } from "@/lib/validations"

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = signupSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // TODO: Check if user already exists
    // const existingUser = await prisma.user.findUnique({
    //   where: { phone: data.phone }
    // })
    // if (existingUser) {
    //   return NextResponse.json(
    //     { success: false, error: "User already exists" },
    //     { status: 409 }
    //   )
    // }

    // TODO: Hash password
    // const hashedPassword = await hashPassword(data.password)

    // TODO: Create user in database
    // const user = await prisma.user.create({
    //   data: {
    //     email: `${data.phone}@wagesse.local`,
    //     phone: data.phone,
    //     password: hashedPassword,
    //     firstName: data.firstName,
    //     lastName: data.lastName,
    //     role: data.role,
    //   }
    // })

    // TODO: Create profile based on role
    // if (data.role === "CLIENT") {
    //   await prisma.customerProfile.create({
    //     data: {
    //       userId: user.id,
    //       city: "Ouagadougou",
    //     }
    //   })
    // } else if (data.role === "TRUCKER") {
    //   await prisma.truckerProfile.create({
    //     data: {
    //       userId: user.id,
    //       city: "Ouagadougou",
    //       truckerType: "INDEPENDENT_DRIVER",
    //     }
    //   })
    // }

    // Generate token (for demo, using hardcoded values)
    const token = generateToken("user_123", `${data.phone}@wagesse.local`, data.role)

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          user: {
            id: "user_123",
            phone: data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role,
          },
        },
        message: "Inscription réussie",
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
