import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const packs = await prisma.creditPack.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { priceXof: "asc" }],
      select: { id: true, code: true, title: true, priceXof: true, credits: true, badge: true },
    })
    return NextResponse.json({ success: true, data: packs }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("[GET /api/credits/packs]", error)
    return NextResponse.json({ success: false, error: "Packs indisponibles" }, { status: 500 })
  }
}
