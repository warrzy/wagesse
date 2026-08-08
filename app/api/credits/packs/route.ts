import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const db = prisma as any
  const fallback = [
    { code: "DISCOVERY", title: "Découverte", priceXof: 1000, credits: 1, badge: null },
    { code: "PACK_5", title: "Pack 5", priceXof: 4000, credits: 5, badge: null },
    { code: "PACK_10", title: "Pack 10", priceXof: 7500, credits: 10, badge: "Populaire" },
    { code: "PACK_30", title: "Pack 30", priceXof: 15000, credits: 30, badge: "Meilleur rapport qualité/prix" },
  ]

  try {
    if (!db?.creditPack?.findMany) {
      return NextResponse.json({ success: true, data: fallback })
    }

    const packs = await db.creditPack.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { priceXof: "asc" }],
      select: { id: true, code: true, title: true, priceXof: true, credits: true, badge: true },
    })

    return NextResponse.json({ success: true, data: packs.length ? packs : fallback })
  } catch {
    return NextResponse.json({ success: true, data: fallback })
  }
}
