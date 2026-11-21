import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { getCreditBalances } from "@/lib/services/credit-service"
import { readQuoteCreditCost } from "@/lib/services/quote-credit"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()

  const [balances, quoteCost] = await Promise.all([
    getCreditBalances(auth.userId),
    readQuoteCreditCost(),
  ])
  return NextResponse.json({
    success: true,
    data: {
      balance: balances.total,
      purchased: balances.purchased,
      subscription: balances.subscription,
      subscriptionExpiresAt: balances.subscriptionExpiresAt,
      quoteCost,
    },
  })
}
