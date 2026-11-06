import { prisma } from '@/lib/prisma';
import { missionTransitionAllowed } from '@/lib/mission-transitions';
import { notifyUser } from '@/lib/notify';
import { MissionStatus } from '@prisma/client';

const truckerSelect = {
  id: true,
  averageRating: true,
  user: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
} as const;

const customerSelect = {
  id: true,
  user: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
} as const;

export const missionService = {
  async getById(missionId: string) {
    return await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        request: true,
        customer: { select: customerSelect },
        trucker: { select: truckerSelect },
        vehicle: true,
        statusHistory: { orderBy: { timestamp: 'desc' } },
        proofs: true,
      },
    });
  },

  async getForUser(
    role: 'CLIENT' | 'TRUCKER',
    profileId: string,
    options?: { status?: MissionStatus; skip?: number; take?: number }
  ) {
    const { status, skip = 0, take = 10 } = options || {};

    const where: any = role === 'CLIENT' ? { customerId: profileId } : { truckerId: profileId };
    if (status) where.status = status;

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        include: {
          request: true,
          customer: { select: customerSelect },
          trucker: { select: truckerSelect },
          vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.mission.count({ where }),
    ]);

    return {
      missions,
      total,
      page: Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
    };
  },

  async updateStatus(
    missionId: string,
    profileId: string,
    role: 'CLIENT' | 'TRUCKER',
    newStatus: MissionStatus,
    changedBy: string
  ) {
    const mission = await prisma.mission.findUnique({ where: { id: missionId } });

    if (!mission) {
      throw new Error('Mission not found');
    }

    const ownsIt = role === 'CLIENT' ? mission.customerId === profileId : mission.truckerId === profileId;
    if (!ownsIt) {
      throw new Error('Unauthorized');
    }

    if (mission.status === 'COMPLETED' || mission.status === 'CANCELLED' || mission.status === 'REFUNDED') {
      throw new Error(`Cannot change status of a ${mission.status} mission`);
    }

    if (!missionTransitionAllowed(role, mission.status, newStatus)) {
      throw new Error('Invalid transition');
    }

    const updatedMission = await prisma.$transaction(async (tx) => {
      const updated = await tx.mission.update({
        where: { id: missionId },
        data: {
          status: newStatus,
          ...(newStatus === 'COMPLETED' && { endDate: new Date() }),
        },
      });

      await tx.missionStatusHistory.create({
        data: {
          missionId,
          previousStatus: mission.status,
          newStatus,
          changedBy,
        },
      });

      return updated;
    });

    try {
      const customer = await prisma.customerProfile.findUnique({ where: { id: mission.customerId }, select: { userId: true } });
      const trucker = await prisma.truckerProfile.findUnique({ where: { id: mission.truckerId }, select: { userId: true } });
      const targetUserId = role === 'CLIENT' ? trucker?.userId : customer?.userId;
      if (targetUserId) {
        const type = newStatus === 'COMPLETED' || newStatus === 'DELIVERED' ? 'DELIVERY_COMPLETED' : newStatus === 'TRUCK_EN_ROUTE_PICKUP' ? 'TRUCK_EN_ROUTE' : 'SYSTEM_ALERT';
        await notifyUser(targetUserId, {
          type,
          title: 'Mission mise à jour',
          message: `Le statut est maintenant ${newStatus}.`,
          actionUrl: `/dashboard/missions/${missionId}`,
        });
      }
    } catch (error) {
      console.error('[notify mission]', error instanceof Error ? error.message : 'notify failed');
    }

    return updatedMission;
  },
};
