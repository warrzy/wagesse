import { prisma } from '@/lib/prisma';
import { createQuoteSchema, CreateQuoteInput } from '@/lib/validations';
import { Quote, QuoteStatus } from '@prisma/client';
import { generateReference } from '@/lib/auth';
import { sanitizeOptionalString } from '@/lib/anti-leak';
import { notifyUser } from '@/lib/notify';

const truckerSelect = {
  id: true,
  averageRating: true,
  acceptanceRate: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
} as const;

const customerSelect = {
  id: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
} as const;

/**
 * Service for managing quotes (price offers from truckers)
 */
export const quoteService = {
  /**
   * Create a new quote for a transport request
   */
  async create(
    truckerId: string,
    data: CreateQuoteInput
  ): Promise<Quote> {
    const validated = createQuoteSchema.parse(data);

    const request = await prisma.transportRequest.findUnique({
      where: { id: validated.requestId },
    });

    if (!request) {
      throw new Error('Transport request not found');
    }

    if (request.status !== 'PUBLISHED') {
      throw new Error('Can only quote on published requests');
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: validated.vehicleId, truckerId },
    });

    if (!vehicle) {
      throw new Error('Vehicle not found or does not belong to you');
    }

    const existingQuote = await prisma.quote.findFirst({
      where: {
        requestId: validated.requestId,
        truckerId,
      },
    });

    if (existingQuote) {
      throw new Error('You have already quoted on this request');
    }

    const quote = await prisma.quote.create({
      data: {
        requestId: validated.requestId,
        truckerId,
        vehicleId: validated.vehicleId,
        totalPrice: validated.totalPrice,
        pricePerTrip: validated.pricePerTrip,
        numberOfTrips: validated.numberOfTrips,
        currencyCode: 'XOF',
        proposedDate: validated.proposedDate,
        validUntil: validated.validUntil,
        comments: sanitizeOptionalString(validated.comments),
        specialConditions: sanitizeOptionalString(validated.specialConditions),
        status: 'PENDING',
      },
      include: {
        request: true,
        trucker: { select: truckerSelect },
      },
    });

    try {
      const owner = await prisma.customerProfile.findUnique({
        where: { id: request.customerId },
        select: { userId: true },
      });
      if (owner) {
        await notifyUser(owner.userId, {
          type: 'NEW_QUOTE_RECEIVED',
          title: 'Nouveau devis',
          message: `Un devis de ${validated.totalPrice} XOF a été reçu.`,
          actionUrl: `/dashboard/client/requests/${request.id}`,
        });
      }
    } catch (error) {
      console.error('[notify quote]', error instanceof Error ? error.message : 'notify failed');
    }

    return quote;
  },

  /**
   * Get a single quote by ID
   */
  async getById(quoteId: string) {
    return await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        request: {
          include: {
            customer: { select: customerSelect },
          },
        },
        trucker: { select: truckerSelect },
        vehicle: true,
      },
    });
  },

  /**
   * Get all quotes for a request
   */
  async getByRequestId(requestId: string) {
    return await prisma.quote.findMany({
      where: { requestId },
      include: {
        trucker: { select: truckerSelect },
        vehicle: true,
      },
      orderBy: { totalPrice: 'asc' },
    });
  },

  /**
   * Get all quotes for a trucker
   */
  async getByTruckerId(
    truckerId: string,
    options?: {
      status?: QuoteStatus;
      skip?: number;
      take?: number;
    }
  ) {
    const { status, skip = 0, take = 10 } = options || {};

    const where: any = { truckerId };
    if (status) {
      where.status = status;
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          request: {
            include: {
              customer: { select: customerSelect },
            },
          },
          vehicle: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.quote.count({ where }),
    ]);

    return {
      quotes,
      total,
      page: Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
    };
  },

  /**
   * Accept a quote (creates a mission)
   */
  async accept(quoteId: string, customerId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { request: true },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.request.customerId !== customerId) {
      throw new Error('Unauthorized');
    }

    if (quote.status !== 'PENDING') {
      throw new Error(`Cannot accept a ${quote.status} quote`);
    }

    if (!quote.vehicleId) {
      throw new Error('Quote has no associated vehicle');
    }

    const customerProfile = await prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: { userId: true },
    });
    const unlockedByUserId = customerProfile?.userId;

    const unlock = unlockedByUserId
      ? await prisma.contactUnlock.findFirst({ where: { requestId: quote.requestId, unlockedByUserId } })
      : null;
    if (!unlock) {
      throw new Error('You must unlock the quotes on this request before accepting one');
    }

    const mission = await prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      await tx.quote.updateMany({
        where: {
          requestId: quote.requestId,
          id: { not: quoteId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED', rejectedAt: new Date() },
      });

      await tx.transportRequest.update({
        where: { id: quote.requestId },
        data: { status: 'ASSIGNED' },
      });

      const pickupLocation = [quote.request.pickupCity, quote.request.pickupSector]
        .filter(Boolean)
        .join(', ');
      const dropoffLocation = [quote.request.dropoffCity, quote.request.dropoffSector]
        .filter(Boolean)
        .join(', ');

      const newMission = await tx.mission.create({
        data: {
          requestId: quote.requestId,
          customerId: quote.request.customerId,
          truckerId: quote.truckerId,
          vehicleId: quote.vehicleId as string,
          missionReference: generateReference('MIS'),
          contractMaterial: quote.request.materialDescription,
          contractQuantity: quote.request.quantity,
          contractUnit: quote.request.unit,
          contractPrice: quote.totalPrice,
          contractCurrency: quote.currencyCode,
          scheduledDate: quote.proposedDate,
          pickupLocation,
          dropoffLocation,
          status: 'ACCEPTED',
        },
        include: {
          request: true,
          trucker: { select: truckerSelect },
          vehicle: true,
        },
      });

      await tx.missionStatusHistory.create({
        data: {
          missionId: newMission.id,
          previousStatus: null,
          newStatus: 'ACCEPTED',
          changedBy: unlockedByUserId,
        },
      });

      return newMission;
    });

    try {
      const trucker = await prisma.truckerProfile.findUnique({
        where: { id: quote.truckerId },
        select: { userId: true },
      });
      if (trucker) {
        await notifyUser(trucker.userId, {
          type: 'QUOTE_ACCEPTED',
          title: 'Devis accepté',
          message: `Votre devis est accepté. Mission ${mission.missionReference}.`,
          actionUrl: `/dashboard/missions/${mission.id}`,
        });
      }
    } catch (error) {
      console.error('[notify accept]', error instanceof Error ? error.message : 'notify failed');
    }

    return mission;
  },

  /**
   * Reject a quote
   */
  async reject(quoteId: string, customerId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { request: true },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.request.customerId !== customerId) {
      throw new Error('Unauthorized');
    }

    if (quote.status !== 'PENDING') {
      throw new Error(`Cannot reject a ${quote.status} quote`);
    }

    return await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'REJECTED', rejectedAt: new Date() },
    });
  },

  /**
   * Cancel / Withdraw a quote (by trucker)
   */
  async withdraw(quoteId: string, truckerId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.truckerId !== truckerId) {
      throw new Error('Unauthorized');
    }

    if (quote.status !== 'PENDING') {
      throw new Error(`Cannot withdraw a ${quote.status} quote`);
    }

    return await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'WITHDRAWN' },
    });
  },

  /**
   * Update quote price (only for PENDING quotes)
   */
  async updatePrice(
    quoteId: string,
    truckerId: string,
    newPrice: number
  ): Promise<Quote> {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.truckerId !== truckerId) {
      throw new Error('Unauthorized');
    }

    if (quote.status !== 'PENDING') {
      throw new Error(`Cannot update price of ${quote.status} quote`);
    }

    if (newPrice <= 0) {
      throw new Error('Price must be greater than 0');
    }

    return await prisma.quote.update({
      where: { id: quoteId },
      data: { totalPrice: newPrice },
    });
  },
};
