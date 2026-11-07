import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, isAdminRole, unauthorized } from "@/lib/api-auth"
import { isFictionalRecetteAccount, preprodTestPhoneVerifyEnabled } from "@/lib/recette-phone"

export const dynamic = "force-dynamic"

/**
 * Marks a fictional preproduction account as phone-verified.
 * No code is generated, stored, or returned. The route does not exist unless
 * PREPROD_TEST_PHONE_VERIFY=true, and only an administrator can call it.
 */
export async function POST(request: NextRequest) {
  if (!preprodTestPhoneVerifyEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isAdminRole(auth.role)) return unauthorized("Forbidden")

  const body = await request.json().catch(() => null)
  const userId = typeof body?.userId === "string" ? body.userId : ""
  if (!userId) {
    return NextResponse.json({ error: "Compte requis" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, firstName: true, lastName: true, role: true, phoneVerified: true },
  })
  if (!user || !isFictionalRecetteAccount(user)) {
    return NextResponse.json({ error: "Compte de recette fictif introuvable" }, { status: 404 })
  }

  if (!user.phoneVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: new Date() },
    })
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        action: "recette_verify_phone",
        resource: "User",
        resourceId: user.id,
        changes: { phoneVerified: true },
      },
    })
  }

  return NextResponse.json({ success: true, data: { userId: user.id, phoneVerified: true } })
}
