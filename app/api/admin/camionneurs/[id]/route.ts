import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { writeAudit } from "@/lib/audit"
import { notifyUser } from "@/lib/notify"

const VERIFICATION = new Set(["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "EXPIRED"])

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const trucker = await prisma.truckerProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        truckerType: true,
        city: true,
        provinceCode: true,
        district: true,
        sector: true,
        operatingLicense: true,
        licenseExpiry: true,
        insurancePolicy: true,
        insuranceExpiry: true,
        orangeMoneyNumber: true,
        mobileMoneyNumber: true,
        bankAccount: true,
        verificationStatus: true,
        verificationBadges: true,
        isAvailable: true,
        lastAvailabilityUpdate: true,
        averageRating: true,
        totalRatings: true,
        totalMissions: true,
        acceptanceRate: true,
        cancellationRate: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true } },
        organization: { select: { id: true, name: true, city: true, registrationNumber: true, contactEmail: true, contactPhone: true } },
        serviceAreas: { orderBy: { createdAt: "desc" }, select: { id: true, city: true, provinceCode: true, radiusKm: true } },
        vehicles: {
          orderBy: { createdAt: "desc" },
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
        documents: {
          orderBy: { uploadedAt: "desc" },
          select: {
            id: true,
            documentType: true,
            fileUrl: true,
            expiryDate: true,
            isVerified: true,
            verifiedBy: true,
            verificationNotes: true,
            uploadedAt: true,
            verifiedAt: true,
          },
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
        currentPlan: { select: { id: true, name: true, tier: true, isActive: true } },
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, status: true, createdAt: true, totalPrice: true, currencyCode: true, requestId: true, acceptedAt: true },
        },
        missions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, status: true, createdAt: true, missionReference: true, requestId: true, contractPrice: true, contractCurrency: true },
        },
        disputes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, status: true, createdAt: true, missionId: true },
        },
        ratings: {
          orderBy: { ratedAt: "desc" },
          take: 20,
          select: { id: true, score: true, category: true, comment: true, ratedAt: true, raterId: true, missionId: true, truckerRatingMissionId: true },
        },
      },
    })

    if (!trucker) {
      return NextResponse.json({ success: false, error: "Camionneur introuvable" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: trucker })
  } catch (error) {
    console.error("[GET /api/admin/camionneurs/[id]]", error)
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

    if (archive) {
      const updated = await prisma.truckerProfile.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          user: { update: { status: "DELETED" as any } },
        },
        select: {
          id: true,
          userId: true,
          truckerType: true,
          city: true,
          provinceCode: true,
          district: true,
          sector: true,
          operatingLicense: true,
          licenseExpiry: true,
          insurancePolicy: true,
          insuranceExpiry: true,
          orangeMoneyNumber: true,
          mobileMoneyNumber: true,
          bankAccount: true,
          verificationStatus: true,
          verificationBadges: true,
          isAvailable: true,
          lastAvailabilityUpdate: true,
          averageRating: true,
          totalRatings: true,
          totalMissions: true,
          acceptanceRate: true,
          cancellationRate: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true } },
          organization: { select: { id: true, name: true, city: true, registrationNumber: true, contactEmail: true, contactPhone: true } },
          serviceAreas: { orderBy: { createdAt: "desc" }, select: { id: true, city: true, provinceCode: true, radiusKm: true } },
          vehicles: {
            orderBy: { createdAt: "desc" },
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
          documents: {
            orderBy: { uploadedAt: "desc" },
            select: {
              id: true,
              documentType: true,
              fileUrl: true,
              expiryDate: true,
              isVerified: true,
              verifiedBy: true,
              verificationNotes: true,
              uploadedAt: true,
              verifiedAt: true,
            },
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
          currentPlan: { select: { id: true, name: true, tier: true, isActive: true } },
          quotes: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, status: true, createdAt: true, totalPrice: true, currencyCode: true, requestId: true, acceptedAt: true },
          },
          missions: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, status: true, createdAt: true, missionReference: true, requestId: true, contractPrice: true, contractCurrency: true },
          },
          disputes: {
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, status: true, createdAt: true, missionId: true },
          },
          ratings: {
            orderBy: { ratedAt: "desc" },
            take: 20,
            select: { id: true, score: true, category: true, comment: true, ratedAt: true, raterId: true, missionId: true, truckerRatingMissionId: true },
          },
        },
      })

      return NextResponse.json({ success: true, data: updated })
    }

    const data: any = {}
    if ((body as any).city !== undefined) data.city = String((body as any).city || "").trim()
    if ((body as any).truckerType !== undefined) data.truckerType = String((body as any).truckerType || "").trim()
    if ((body as any).organizationId !== undefined) {
      const v = String((body as any).organizationId || "").trim()
      data.organization = v ? { connect: { id: v } } : { disconnect: true }
    }
    if ((body as any).verificationStatus !== undefined) data.verificationStatus = String((body as any).verificationStatus || "").trim()
    if ((body as any).isAvailable !== undefined) data.isAvailable = Boolean((body as any).isAvailable)

    const userUpdate: any = {}
    if ((body as any).userEmail !== undefined) userUpdate.email = String((body as any).userEmail || "").trim().toLowerCase()
    if ((body as any).userPhone !== undefined) userUpdate.phone = String((body as any).userPhone || "").trim()
    if ((body as any).userFirstName !== undefined) userUpdate.firstName = (body as any).userFirstName === null ? null : String((body as any).userFirstName || "").trim() || null
    if ((body as any).userLastName !== undefined) userUpdate.lastName = (body as any).userLastName === null ? null : String((body as any).userLastName || "").trim() || null
    if ((body as any).userStatus !== undefined) userUpdate.status = String((body as any).userStatus || "").trim()

    if (data.verificationStatus && !VERIFICATION.has(data.verificationStatus)) {
      return NextResponse.json({ success: false, error: "Statut de vérification inconnu" }, { status: 400 })
    }

    if (Object.keys(data).length === 0 && Object.keys(userUpdate).length === 0) {
      return NextResponse.json({ success: false, error: "Aucune modification" }, { status: 400 })
    }

    const updated = await prisma.truckerProfile.update({
      where: { id },
      data: {
        ...(Object.keys(data).length ? data : {}),
        ...(Object.keys(userUpdate).length ? { user: { update: userUpdate } } : {}),
      },
      select: {
        id: true,
        userId: true,
        truckerType: true,
        city: true,
        provinceCode: true,
        district: true,
        sector: true,
        operatingLicense: true,
        licenseExpiry: true,
        insurancePolicy: true,
        insuranceExpiry: true,
        orangeMoneyNumber: true,
        mobileMoneyNumber: true,
        bankAccount: true,
        verificationStatus: true,
        verificationBadges: true,
        isAvailable: true,
        lastAvailabilityUpdate: true,
        averageRating: true,
        totalRatings: true,
        totalMissions: true,
        acceptanceRate: true,
        cancellationRate: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true, createdAt: true, lastLoginAt: true } },
        organization: { select: { id: true, name: true, city: true, registrationNumber: true, contactEmail: true, contactPhone: true } },
        serviceAreas: { orderBy: { createdAt: "desc" }, select: { id: true, city: true, provinceCode: true, radiusKm: true } },
        vehicles: {
          orderBy: { createdAt: "desc" },
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
        documents: {
          orderBy: { uploadedAt: "desc" },
          select: {
            id: true,
            documentType: true,
            fileUrl: true,
            expiryDate: true,
            isVerified: true,
            verifiedBy: true,
            verificationNotes: true,
            uploadedAt: true,
            verifiedAt: true,
          },
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
        currentPlan: { select: { id: true, name: true, tier: true, isActive: true } },
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, status: true, createdAt: true, totalPrice: true, currencyCode: true, requestId: true, acceptedAt: true },
        },
        missions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, status: true, createdAt: true, missionReference: true, requestId: true, contractPrice: true, contractCurrency: true },
        },
        disputes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, status: true, createdAt: true, missionId: true },
        },
        ratings: {
          orderBy: { ratedAt: "desc" },
          take: 20,
          select: { id: true, score: true, category: true, comment: true, ratedAt: true, raterId: true, missionId: true, truckerRatingMissionId: true },
        },
      },
    })

    if (data.verificationStatus) {
      await writeAudit(auth.userId, "verify_trucker", "TruckerProfile", id, {
        verificationStatus: data.verificationStatus,
      })
      if (data.verificationStatus === "VERIFIED" || data.verificationStatus === "REJECTED") {
        await notifyUser(updated.userId, {
          type: data.verificationStatus === "VERIFIED" ? "PROFILE_VALIDATED" : "PROFILE_REJECTED",
          title: data.verificationStatus === "VERIFIED" ? "Profil validé" : "Profil refusé",
          message: data.verificationStatus === "VERIFIED"
            ? "Votre profil transporteur est validé."
            : "Votre profil transporteur a été refusé.",
          actionUrl: "/dashboard/trucker",
        })
      }
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    const msg = String(error?.message || "")
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { success: false, error: "Email ou téléphone déjà utilisé" },
        { status: 409 }
      )
    }

    console.error("[PATCH /api/admin/camionneurs/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
