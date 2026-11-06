import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { getActiveSubscriptionForUser } from "@/lib/services/subscription-service"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()

  const sub = await getActiveSubscriptionForUser(auth.userId)
  return NextResponse.json({ success: true, data: sub })
}
