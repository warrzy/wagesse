import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

function toInt(s: string | null, fallback: number) {
  const n = parseInt(s || "", 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(toInt(searchParams.get("page"), 1), 1)
    const pageSize = Math.min(Math.max(toInt(searchParams.get("pageSize"), 20), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const isActiveRaw = (searchParams.get("isActive") || "").trim()
    const sort = (searchParams.get("sort") || "sortOrder_asc").trim()

    const where: Prisma.CreditPackWhereInput = {}

    if (q) {
      where.OR = [
        { code: { contains: q } },
        { title: { contains: q } },
      ]
    }

    if (isActiveRaw) {
      if (isActiveRaw === "true") where.isActive = true
      if (isActiveRaw === "false") where.isActive = false
    }

    let orderBy: Prisma.CreditPackOrderByWithRelationInput = { sortOrder: "asc" }
    if (sort === "price_desc") orderBy = { priceXof: "desc" }
    if (sort === "price_asc") orderBy = { priceXof: "asc" }
    if (sort === "credits_desc") orderBy = { credits: "desc" }
    if (sort === "credits_asc") orderBy = { credits: "asc" }
    if (sort === "createdAt_desc") orderBy = { createdAt: "desc" }
    if (sort === "createdAt_asc") orderBy = { createdAt: "asc" }
    if (sort === "sortOrder_desc") orderBy = { sortOrder: "desc" }

    const [items, total] = await Promise.all([
      prisma.creditPack.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
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
      }),
      prisma.creditPack.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        items,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/credit-packs]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const body = await request.json()

    const code = String(body?.code || "").trim()
    const title = String(body?.title || "").trim()
    const priceXof = Number(body?.priceXof)
    const credits = Number(body?.credits)

    if (!code) return NextResponse.json({ success: false, error: "code manquant" }, { status: 400 })
    if (!title) return NextResponse.json({ success: false, error: "title manquant" }, { status: 400 })
    if (!Number.isFinite(priceXof) || priceXof <= 0) {
      return NextResponse.json({ success: false, error: "priceXof invalide" }, { status: 400 })
    }
    if (!Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json({ success: false, error: "credits invalide" }, { status: 400 })
    }

    const created = await prisma.creditPack.create({
      data: {
        code,
        title,
        priceXof: Math.round(priceXof),
        credits: Math.round(credits),
        badge: body?.badge ? String(body.badge) : null,
        isActive: body?.isActive !== undefined ? Boolean(body.isActive) : true,
        sortOrder: body?.sortOrder !== undefined ? Number(body.sortOrder) : 0,
      },
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

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Ce code est déjà utilisé par un autre pack." },
        { status: 409 }
      )
    }

    console.error("[POST /api/admin/credit-packs]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
