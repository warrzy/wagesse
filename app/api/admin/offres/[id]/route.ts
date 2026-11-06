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

    const quote = await prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        requestId: true,
        truckerId: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        proposedDate: true,
        validUntil: true,
        totalPrice: true,
        currencyCode: true,
        pricePerTrip: true,
        numberOfTrips: true,
        comments: true,
        specialConditions: true,
        acceptedAt: true,
        rejectedAt: true,
        material: { select: { id: true, name: true } },
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: true,
            model: true,
            year: true,
            vehicleType: true,
            capacityTonnes: true,
            capacityM3: true,
            isOperational: true,
            condition: true,
          },
        },
        request: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            requestedDate: true,
            pickupCity: true,
            dropoffCity: true,
            quantity: true,
            unit: true,
            materialDescription: true,
            material: { select: { id: true, name: true } },
            customer: {
              select: {
                id: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
              },
            },
          },
        },
        trucker: {
          select: {
            id: true,
            city: true,
            verificationStatus: true,
            averageRating: true,
            totalMissions: true,
            user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
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
            payment: {
              select: {
                id: true,
                reference: true,
                status: true,
                type: true,
                amount: true,
                currency: true,
                providerName: true,
                initiatedAt: true,
                confirmedAt: true,
              },
            },
            statusHistory: {
              orderBy: { timestamp: "asc" },
              select: { previousStatus: true, newStatus: true, reason: true, notes: true, changedBy: true, timestamp: true },
            },
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ success: false, error: "Offre introuvable" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error("[GET /api/admin/offres/[id]]", error)
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

    if (body?.totalPrice !== undefined) data.totalPrice = Number(body.totalPrice)
    if (body?.pricePerTrip !== undefined) data.pricePerTrip = body.pricePerTrip === null ? null : Number(body.pricePerTrip)
    if (body?.numberOfTrips !== undefined) data.numberOfTrips = Number(body.numberOfTrips)
    if (body?.currencyCode !== undefined) data.currencyCode = String(body.currencyCode)

    if (body?.proposedDate !== undefined) data.proposedDate = new Date(body.proposedDate)
    if (body?.validUntil !== undefined) data.validUntil = new Date(body.validUntil)
    if (body?.estimatedDuration !== undefined) data.estimatedDuration = body.estimatedDuration === null ? null : String(body.estimatedDuration)

    if (body?.vehicleId !== undefined) data.vehicleId = body.vehicleId === null ? null : String(body.vehicleId)
    if (body?.materialId !== undefined) data.materialId = body.materialId === null ? null : String(body.materialId)

    if (body?.comments !== undefined) data.comments = body.comments === null ? null : String(body.comments)
    if (body?.specialConditions !== undefined) data.specialConditions = body.specialConditions === null ? null : String(body.specialConditions)

    if (body?.status !== undefined) {
      const next = String(body.status)
      data.status = next
      if (next === "ACCEPTED") {
        data.acceptedAt = new Date()
        data.rejectedAt = null
      }
      if (next === "REJECTED") {
        data.rejectedAt = new Date()
      }
      if (next !== "REJECTED" && next !== "ACCEPTED") {
        if (body?.clearDecisionTimestamps === true) {
          data.acceptedAt = null
          data.rejectedAt = null
        }
      }
    }

    if (body?.archive === true) {
      data.status = "WITHDRAWN"
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No changes" }, { status: 400 })
    }

    const updated = await prisma.quote.update({
      where: { id },
      data,
      select: {
        id: true,
        requestId: true,
        truckerId: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        proposedDate: true,
        validUntil: true,
        totalPrice: true,
        currencyCode: true,
        pricePerTrip: true,
        numberOfTrips: true,
        comments: true,
        specialConditions: true,
        acceptedAt: true,
        rejectedAt: true,
        vehicle: { select: { id: true, licensePlate: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("[PATCH /api/admin/offres/[id]]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
