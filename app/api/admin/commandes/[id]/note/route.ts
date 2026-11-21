import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isSuperAdmin, unauthorized } from "@/lib/api-auth"
import { commercialOrderService } from "@/lib/services/commercial-order-service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isSuperAdmin(auth.role)) {
      return NextResponse.json(
        { success: false, error: "Seul le super administrateur peut annoter une commande.", code: "SUPER_ADMIN_REQUIRED" },
        { status: 403 }
      )
    }
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const result = await commercialOrderService.annotate(id, auth.userId, String(body?.action || ""), String(body?.note || ""))
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    if (error?.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Commande introuvable" }, { status: 404 })
    }
    if (error?.message === "NOTE_REQUIRED") {
      return NextResponse.json({ success: false, error: "Une note est requise" }, { status: 400 })
    }
    if (error?.message === "ACTION_INVALID") {
      return NextResponse.json({ success: false, error: "Action inconnue" }, { status: 400 })
    }
    if (error?.message === "ORDER_CLOSED") {
      return NextResponse.json({ success: false, error: "La commande n'est plus en attente" }, { status: 409 })
    }
    console.error("[POST /api/admin/commandes/[id]/note]", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
