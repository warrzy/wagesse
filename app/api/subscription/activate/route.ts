import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { activateOrRenewSubscription } from "@/lib/services/subscription-service"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()

    const body = await request.json()
    const planCode = String(body?.planCode || "")

    if (!planCode) {
      return NextResponse.json({ success: false, error: "planCode manquant" }, { status: 400 })
    }

    const db = prisma as any
    const plan = await db.subscriptionPlan.findUnique({ where: { code: planCode } })
    if (!plan || !plan.isActive) {
      return NextResponse.json({ success: false, error: "Plan invalide" }, { status: 400 })
    }

    const sub = await activateOrRenewSubscription({ userId: auth.userId, planCode })
    return NextResponse.json({ success: true, data: sub })
  } catch (error: any) {
    console.error('[POST /api/subscription/activate]', error)
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
