import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export interface AuthContext {
  userId: string
  email: string
  role: string
}

export function getAuthContext(request: NextRequest): AuthContext | null {
  const token = request.headers.get("Authorization")?.split(" ")[1]
  if (!token) return null
  return verifyToken(token)
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
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
