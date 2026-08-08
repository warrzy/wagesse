import { prisma } from '@/lib/prisma';
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

    return await prisma.$transaction(async (tx) => {
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
  },
};
