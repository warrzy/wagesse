import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()

  const unlocks = await prisma.contactUnlock.findMany({
    where: { unlockedByUserId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestId: true,
      unlockedContacts: true,
      createdAt: true,
      request: {
        select: {
          id: true,
          pickupCity: true,
          dropoffCity: true,
          materialDescription: true,
        },
      },
    },
  })

  return NextResponse.json({ success: true, data: unlocks })
}
