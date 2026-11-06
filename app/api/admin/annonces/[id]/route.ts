import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const req = await prisma.transportRequest.findUnique({
      where: { id },
      select: {
        id: true,
        requestType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        expiresAt: true,
        requestedDate: true,
        pickupCity: true,
        pickupProvince: true,
        pickupDistrict: true,
        pickupSector: true,
        pickupLandmark: true,
        dropoffCity: true,
        dropoffProvince: true,
        dropoffDistrict: true,
        dropoffSector: true,
        dropoffLandmark: true,
        quantity: true,
        unit: true,
        budgetEstimate: true,
        currencyCode: true,
        notes: true,
        materialDescription: true,
        material: { select: { id: true, name: true, category: true } },
        customer: {
          select: {
            id: true,
            companyName: true,
            companyType: true,
            city: true,
            user: {
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
              },
            },
            subscriptions: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                plan: { select: { id: true, name: true, tier: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            createdAt: true,
            acceptedAt: true,
            rejectedAt: true,
            totalPrice: true,
            currencyCode: true,
            proposedDate: true,
            comments: true,
            trucker: {
              select: {
                id: true,
                verificationStatus: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
              },
            },
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
                capacityTonnes: true,
                isOperational: true,
              },
            },
          },
        },
        missions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            createdAt: true,
            missionReference: true,
            scheduledDate: true,
            startDate: true,
            endDate: true,
            contractPrice: true,
            contractCurrency: true,
            platformCommission: true,
            platformCommissionRate: true,
            trucker: {
              select: {
                id: true,
                verificationStatus: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
              },
            },
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
                capacityTonnes: true,
                isOperational: true,
              },
            },
            payment: {
              select: {
                id: true,
                type: true,
                status: true,
                amount: true,
                currency: true,
                reference: true,
                providerName: true,
                initiatedAt: true,
                confirmedAt: true,
              },
            },
            statusHistory: {
              orderBy: { timestamp: "asc" },
              select: {
                previousStatus: true,
                newStatus: true,
                reason: true,
                notes: true,
                changedBy: true,
                timestamp: true,
              },
            },
          },
        },
        contactUnlocks: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            unlockedByUser: { select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    })

    if (!req) {
      return NextResponse.json({ success: false, error: "Annonce introuvable" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: req })
  } catch (error) {
    console.error("[GET /api/admin/annonces/[id]]", error)
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
    const body = await request.json()

    const data: any = {}

    if (body?.pickupCity !== undefined) data.pickupCity = String(body.pickupCity)
    if (body?.dropoffCity !== undefined) data.dropoffCity = String(body.dropoffCity)
    if (body?.pickupSector !== undefined) data.pickupSector = body.pickupSector === null ? null : String(body.pickupSector)
    if (body?.dropoffSector !== undefined) data.dropoffSector = body.dropoffSector === null ? null : String(body.dropoffSector)

    if (body?.quantity !== undefined) data.quantity = Number(body.quantity)
    if (body?.unit !== undefined) data.unit = String(body.unit)
    if (body?.requestedDate !== undefined) data.requestedDate = new Date(body.requestedDate)

    if (body?.materialId !== undefined) data.materialId = body.materialId === null ? null : String(body.materialId)
    if (body?.materialDescription !== undefined) {
      data.materialDescription = body.materialDescription === null ? null : String(body.materialDescription)
    }

    if (body?.notes !== undefined) data.notes = body.notes === null ? null : String(body.notes)
    if (body?.budgetEstimate !== undefined) data.budgetEstimate = body.budgetEstimate === null ? null : Number(body.budgetEstimate)

    if (body?.status !== undefined) data.status = String(body.status)

    if (body?.archive === true) {
      data.deletedAt = new Date()
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No changes" }, { status: 400 })
    }

    const updated = await prisma.transportRequest.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
        requestedDate: true,
        pickupCity: true,
        dropoffCity: true,
        quantity: true,
        unit: true,
        materialDescription: true,
        material: { select: { id: true, name: true } },
        notes: true,
        budgetEstimate: true,
        currencyCode: true,
        updatedAt: true,
        deletedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("[PATCH /api/admin/annonces/[id]]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
