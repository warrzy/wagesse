import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { commercialOrderService } from "@/lib/services/commercial-order-service"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  const orders = await commercialOrderService.listForUser(auth.userId)
  return NextResponse.json({ success: true, data: orders })
}
