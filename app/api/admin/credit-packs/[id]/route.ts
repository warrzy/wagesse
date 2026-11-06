import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const pack = await prisma.creditPack.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        title: true,
        priceXof: true,
        credits: true,
        badge: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!pack) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: pack })
  } catch (error) {
    console.error("[GET /api/admin/credit-packs/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const pack = await prisma.creditPack.findUnique({ where: { id }, select: { id: true, code: true } })
    if (!pack) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
    }

    const used = await prisma.payment.findFirst({
      where: {
        type: "CREDIT_PURCHASE",
        metadata: { path: ["packCode"], equals: pack.code },
      } as any,
      select: { id: true },
    })

    if (used) {
      return NextResponse.json(
        { success: false, error: "Ce pack a déjà été utilisé dans des paiements. Désactive-le plutôt." },
        { status: 409 }
      )
    }

    await prisma.creditPack.delete({ where: { id } })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error("[DELETE /api/admin/credit-packs/[id]]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params
    const body = await request.json()

    const data: any = {}

    if (body?.code !== undefined) data.code = String(body.code)
    if (body?.title !== undefined) data.title = String(body.title)
    if (body?.priceXof !== undefined) data.priceXof = Math.round(Number(body.priceXof))
    if (body?.credits !== undefined) data.credits = Math.round(Number(body.credits))
    if (body?.badge !== undefined) data.badge = body.badge === null ? null : String(body.badge)
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No changes" }, { status: 400 })
    }

    const updated = await prisma.creditPack.update({
      where: { id },
      data,
      select: {
        id: true,
        code: true,
        title: true,
        priceXof: true,
        credits: true,
        badge: true,
        isActive: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Ce code est déjà utilisé par un autre pack." },
        { status: 409 }
      )
    }

    console.error("[PATCH /api/admin/credit-packs/[id]]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
