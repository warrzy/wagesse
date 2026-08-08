import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const mission = await prisma.mission.findUnique({
      where: { id },
      select: {
        id: true,
        missionReference: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        scheduledDate: true,
        startDate: true,
        endDate: true,
        pickupLocation: true,
        dropoffLocation: true,
        contractMaterial: true,
        contractQuantity: true,
        contractUnit: true,
        contractPrice: true,
        contractCurrency: true,
        platformCommission: true,
        platformCommissionRate: true,
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
            notes: true,
            materialDescription: true,
            material: { select: { id: true, name: true } },
            quotes: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                status: true,
                totalPrice: true,
                currencyCode: true,
                createdAt: true,
                acceptedAt: true,
                trucker: { select: { id: true, user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } } },
                vehicle: { select: { id: true, licensePlate: true, capacityTonnes: true, isOperational: true } },
              },
            },
            customer: {
              select: {
                id: true,
                user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true } },
              },
            },
          },
        },
        customer: {
          select: { id: true, user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
        },
        trucker: {
          select: {
            id: true,
            verificationStatus: true,
            averageRating: true,
            totalMissions: true,
            user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          },
        },
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
        payment: {
          select: {
            id: true,
            reference: true,
            status: true,
            type: true,
            amount: true,
            currency: true,
            providerName: true,
            providerReference: true,
            initiatedAt: true,
            confirmedAt: true,
            failedAt: true,
          },
        },
        statusHistory: {
          orderBy: { timestamp: "asc" },
          select: { previousStatus: true, newStatus: true, reason: true, notes: true, changedBy: true, timestamp: true },
        },
        proofs: {
          orderBy: { id: "asc" },
          select: { id: true, proofType: true, photoUrl: true, otpCode: true, otpVerifiedAt: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, type: true, amount: true, currency: true, status: true, reference: true, createdAt: true },
        },
        commissions: {
          orderBy: { createdAt: "desc" },
          select: { id: true, commissionAmount: true, commissionRate: true, missionAmount: true, currency: true, status: true, createdAt: true, paidAt: true },
        },
      },
    })

    if (!mission) {
      return NextResponse.json({ success: false, error: "Transport introuvable" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: mission })
  } catch (error) {
    console.error("[GET /api/admin/transports/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.mission.findUnique({
      where: { id },
      select: { id: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: "Transport introuvable" }, { status: 404 })
    }

    const data: any = {}

    if (body?.scheduledDate !== undefined) data.scheduledDate = new Date(body.scheduledDate)
    if (body?.startDate !== undefined) data.startDate = body.startDate === null ? null : new Date(body.startDate)
    if (body?.endDate !== undefined) data.endDate = body.endDate === null ? null : new Date(body.endDate)

    if (body?.contractPrice !== undefined) data.contractPrice = Number(body.contractPrice)
    if (body?.contractCurrency !== undefined) data.contractCurrency = String(body.contractCurrency)
    if (body?.platformCommissionRate !== undefined) data.platformCommissionRate = Number(body.platformCommissionRate)
    if (body?.platformCommission !== undefined) data.platformCommission = body.platformCommission === null ? null : Number(body.platformCommission)

    if (body?.status !== undefined) data.status = String(body.status)
    if (body?.archive === true) data.status = "CANCELLED"

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No changes" }, { status: 400 })
    }

    const nextStatus = data.status
    const statusChanged = nextStatus !== undefined && String(nextStatus) !== String(existing.status)

    const updated = await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.update({
        where: { id },
        data,
        select: {
          id: true,
          missionReference: true,
          status: true,
          scheduledDate: true,
          startDate: true,
          endDate: true,
          contractPrice: true,
          contractCurrency: true,
          platformCommission: true,
          platformCommissionRate: true,
          updatedAt: true,
        },
      })

      if (statusChanged) {
        await tx.missionStatusHistory.create({
          data: {
            missionId: id,
            previousStatus: existing.status as any,
            newStatus: String(nextStatus) as any,
            reason: body?.reason ? String(body.reason) : body?.archive ? "ADMIN_ARCHIVE" : "ADMIN_UPDATE",
            notes: body?.notes ? String(body.notes) : null,
            changedBy: auth.userId,
          },
        })
      }

      return mission
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("[PATCH /api/admin/transports/[id]]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
