import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdminRole, unauthorized } from "@/lib/api-auth"
import { commercialOrderService } from "@/lib/services/commercial-order-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()
  if (!isAdminRole(auth.role)) return unauthorized("Forbidden")
  const { id } = await params
  const order = await commercialOrderService.adminGet(id)
  if (!order) return NextResponse.json({ success: false, error: "Commande introuvable" }, { status: 404 })
  return NextResponse.json({ success: true, data: order })
}
