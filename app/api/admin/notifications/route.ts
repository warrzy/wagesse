import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, isAdminRole, unauthorized } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isAdminRole(auth.role)) return unauthorized("Forbidden")

  const items = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true, role: true } },
    },
  })

  return NextResponse.json({ success: true, data: { items } })
}
