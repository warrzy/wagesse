import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { getCreditBalances } from "@/lib/services/credit-service"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()

  const balances = await getCreditBalances(auth.userId)
  return NextResponse.json({
    success: true,
    data: {
      balance: balances.total,
      purchased: balances.purchased,
      subscription: balances.subscription,
      subscriptionExpiresAt: balances.subscriptionExpiresAt,
    },
  })
}
