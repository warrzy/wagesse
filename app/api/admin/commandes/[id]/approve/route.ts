import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdminRole, unauthorized } from "@/lib/api-auth"
import { commercialOrderService } from "@/lib/services/commercial-order-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdminRole(auth.role)) return unauthorized("Forbidden")
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const note = body?.note ? String(body.note) : undefined
    const result = await commercialOrderService.approve(id, auth.userId, note)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Commande introuvable" }, { status: 404 })
    }
    console.error("[POST /api/admin/commandes/[id]/approve]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
