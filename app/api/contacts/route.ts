import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

/**
 * Contacts of an accepted mission. Stored unlock payloads are not returned.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request)
  if (!auth) return unauthorized()

  const customerId = await getCustomerProfileId(auth.userId)
  const truckerId = await getTruckerProfileId(auth.userId)
  const filters = [
    ...(customerId ? [{ customerId }] : []),
    ...(truckerId ? [{ truckerId }] : []),
  ]
  if (filters.length === 0) {
    return NextResponse.json({ success: true, data: [] })
  }

  const missions = await prisma.mission.findMany({
    where: { OR: filters },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      requestId: true,
      createdAt: true,
      customer: {
        select: {
          userId: true,
          user: { select: { phone: true, email: true, firstName: true, lastName: true } },
        },
      },
      trucker: {
        select: {
          userId: true,
          user: { select: { phone: true, email: true, firstName: true, lastName: true } },
        },
      },
      request: {
        select: {
          id: true,
          pickupCity: true,
          dropoffCity: true,
          materialDescription: true,
        },
      },
    },
  })

  const data = missions.map((mission) => {
    const other = mission.customer.userId === auth.userId ? mission.trucker.user : mission.customer.user
    return {
      id: mission.id,
      requestId: mission.requestId,
      createdAt: mission.createdAt,
      request: mission.request,
      contactsReleased: true,
      unlockedContacts: [
        {
          phone: other.phone,
          email: other.email,
          firstName: other.firstName,
          lastName: other.lastName,
        },
      ],
    }
  })

  return NextResponse.json({ success: true, data })
}
