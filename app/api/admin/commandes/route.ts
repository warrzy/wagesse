import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdminRole, unauthorized } from "@/lib/api-auth"
import { commercialOrderService } from "@/lib/services/commercial-order-service"

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isAdminRole(auth.role)) return unauthorized("Forbidden")

  const { searchParams } = new URL(request.url)
  const data = await commercialOrderService.adminList({
    q: searchParams.get("q") || undefined,
    status: searchParams.get("status") || undefined,
    kind: searchParams.get("kind") || undefined,
    page: Number(searchParams.get("page") || "1"),
    pageSize: Number(searchParams.get("pageSize") || "20"),
  })
  return NextResponse.json({ success: true, data })
}
