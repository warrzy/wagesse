import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export interface AuthContext {
  userId: string
  email: string
  role: string
}

export function isAdminRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token = request.headers.get("Authorization")?.split(" ")[1]
  if (!token) return null
  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, status: true, deletedAt: true },
  })
  if (!user || user.deletedAt || user.status !== "ACTIVE") return null
  return { userId: user.id, email: user.email, role: user.role }
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export async function requireVerifiedPhone(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneVerified: true },
  })
  if (user?.phoneVerified) return null
  return NextResponse.json(
    {
      success: false,
      error: "Vérifiez votre numéro de téléphone avant cette opération.",
      code: "PHONE_NOT_VERIFIED",
    },
    { status: 403 }
  )
}

export async function getCustomerProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  return profile?.id ?? null
}

export async function getTruckerProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.truckerProfile.findUnique({
    where: { userId },
    select: { id: true },
  })
  return profile?.id ?? null
}
