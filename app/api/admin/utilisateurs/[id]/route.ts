import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { hashPassword } from "@/lib/auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        customerProfile: {
          select: {
            id: true,
            companyName: true,
            companyType: true,
            city: true,
            totalRequests: true,
            totalMissions: true,
            subscriptions: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                plan: { select: { id: true, name: true, tier: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
        truckerProfile: {
          select: {
            id: true,
            city: true,
            truckerType: true,
            verificationStatus: true,
            averageRating: true,
            totalMissions: true,
            acceptanceRate: true,
            cancellationRate: true,
            vehicles: {
              select: { id: true, licensePlate: true, brand: true, model: true, year: true, vehicleType: true, capacityTonnes: true, isOperational: true },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            subscription: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                plan: { select: { id: true, name: true, tier: true } },
              },
            },
            currentPlan: { select: { id: true, name: true, tier: true } },
          },
        },
        creditWallet: {
          select: {
            id: true,
            balance: true,
            purchasedBalance: true,
            subscriptionBalance: true,
            subscriptionBalanceExpiresAt: true,
            createdAt: true,
            updatedAt: true,
            transactions: {
              orderBy: { createdAt: "desc" },
              take: 20,
              select: { id: true, type: true, amount: true, balanceAfter: true, createdAt: true, metadata: true },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: "Utilisateur introuvable" }, { status: 404 })
    }

    const [recentRequests, recentQuotes, recentMissions, recentPayments] = await Promise.all([
      prisma.transportRequest.findMany({
        where: { customer: { userId: id }, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, status: true, createdAt: true, pickupCity: true, dropoffCity: true, quantity: true, unit: true },
      }),
      prisma.quote.findMany({
        where: { trucker: { userId: id } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, status: true, createdAt: true, totalPrice: true, currencyCode: true, requestId: true },
      }),
      prisma.mission.findMany({
        where: { OR: [{ customer: { userId: id } }, { trucker: { userId: id } }] },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, status: true, createdAt: true, missionReference: true, requestId: true, contractPrice: true, contractCurrency: true },
      }),
      prisma.payment.findMany({
        where: { payer: id },
        orderBy: { initiatedAt: "desc" },
        take: 10,
        select: { id: true, reference: true, status: true, type: true, amount: true, currency: true, providerName: true, initiatedAt: true, confirmedAt: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        user,
        activity: {
          requests: recentRequests,
          quotes: recentQuotes,
          missions: recentMissions,
          payments: recentPayments,
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/utilisateurs/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Payload invalide" }, { status: 400 })
    }

    const archive = Boolean((body as any).archive)

    const data: any = {}

    if (archive) {
      data.status = "DELETED"
    } else {
      if ((body as any).email !== undefined) data.email = String((body as any).email || "").trim().toLowerCase()
      if ((body as any).phone !== undefined) data.phone = String((body as any).phone || "").trim()
      if ((body as any).firstName !== undefined) data.firstName = (body as any).firstName === null ? null : String((body as any).firstName || "").trim() || null
      if ((body as any).lastName !== undefined) data.lastName = (body as any).lastName === null ? null : String((body as any).lastName || "").trim() || null
      if ((body as any).role !== undefined) data.role = String((body as any).role || "").trim()
      if ((body as any).status !== undefined) data.status = String((body as any).status || "").trim()

      if ((body as any).password !== undefined) {
        const password = String((body as any).password || "")
        if (password.length < 6) {
          return NextResponse.json({ success: false, error: "Mot de passe trop court" }, { status: 400 })
        }
        data.password = await hashPassword(password)
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "Aucune modification" }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        deletedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    const msg = String(error?.message || "")
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { success: false, error: "Email ou téléphone déjà utilisé" },
        { status: 409 }
      )
    }

    console.error("[PATCH /api/admin/utilisateurs/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
