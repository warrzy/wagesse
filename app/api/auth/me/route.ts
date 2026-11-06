import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        customerProfile: true,
        truckerProfile: true,
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 404 })
    }

    const { password, twoFactorSecret, ...safeUser } = user

    return NextResponse.json({ success: true, data: safeUser })
  } catch (error) {
    console.error("Get current user error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
