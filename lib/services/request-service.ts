import { prisma } from '@/lib/prisma';
import { createTransportRequestSchema, CreateTransportRequestInput } from '@/lib/validations';
import { TransportRequest, RequestStatus } from '@prisma/client';
import { maskEmail, maskPhoneNumber } from '@/lib/auth';
import { sanitizeOptionalString } from '@/lib/anti-leak';

const customerSelect = {
  id: true,
  city: true,
  user: {
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

const truckerSelect = {
  id: true,
  truckerType: true,
  averageRating: true,
  totalRatings: true,
  acceptanceRate: true,
  user: {
    select: {
      id: true,
      phone: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

/**
 * Service for managing transport requests
 */
export const requestService = {
  /**
   * Create a new transport request
   */
  async create(
    customerId: string,
    data: CreateTransportRequestInput
  ): Promise<TransportRequest> {
    const validated = createTransportRequestSchema.parse(data);

    const request = await prisma.transportRequest.create({
      data: {
        customerId,
        materialDescription: sanitizeOptionalString(validated.material) || validated.material,
        quantity: validated.quantity,
        unit: validated.unit,
        pickupCity: validated.pickupCity,
        pickupSector: sanitizeOptionalString(validated.pickupSector),
        dropoffCity: validated.dropoffCity,
        dropoffSector: sanitizeOptionalString(validated.dropoffSector),
        requestedDate: validated.requestedDate,
        urgency: validated.urgency,
        minCapacity: validated.minCapacity,
        truckTypePreference: sanitizeOptionalString(validated.truckTypePreference),
        needsDriver: validated.needsDriver,
        numberOfTrucks: validated.numberOfTrucks,
        budgetEstimate: validated.budgetEstimate,
        notes: sanitizeOptionalString(validated.comments),
        status: 'DRAFT',
      },
      include: {
        customer: { select: customerSelect },
      },
    });

    return request;
  },

  /**
   * Get a single request by ID (owner view). Quote details (price, trucker
   * identity, vehicle) stay hidden until the customer pays to unlock them —
   * only the count/status of received quotes is visible before that.
   */
  async getById(requestId: string, unlockedByUserId?: string | null) {
    const request = await prisma.transportRequest.findUnique({
      where: { id: requestId },
      include: {
        customer: { select: customerSelect },
        quotes: {
          include: {
            trucker: { select: truckerSelect },
            vehicle: true,
          },
        },
        matches: {
          include: {
            trucker: { select: truckerSelect },
          },
        },
      },
    });

    if (!request) return null;

    const unlock = unlockedByUserId
      ? await prisma.contactUnlock.findFirst({ where: { requestId, unlockedByUserId } })
      : null;
    const contactsUnlocked = !!unlock;

    const quotes = contactsUnlocked
      ? request.quotes.map((q) => ({ ...q, locked: false as const }))
      : request.quotes.map((q) => ({
          id: q.id,
          status: q.status,
          createdAt: q.createdAt,
          locked: true as const,
        }));

    if (!contactsUnlocked) {
      for (const match of request.matches) {
        match.trucker.user.phone = maskPhoneNumber(match.trucker.user.phone);
      }
    }

    return { ...request, quotes, contactsUnlocked };
  },

  /**
   * Get a single published request without exposing other truckers' quotes
   * (used when a trucker views a request to decide whether to quote on it)
   */
  async getPublicById(requestId: string) {
    return await prisma.transportRequest.findFirst({
      where: { id: requestId, status: { not: 'DRAFT' }, deletedAt: null },
      include: {
        customer: { select: customerSelect },
      },
    });
  },

  async getPublicByIdForUser(requestId: string, unlockedByUserId: string) {
    const request = await prisma.transportRequest.findFirst({
      where: { id: requestId, status: { not: 'DRAFT' }, deletedAt: null },
      include: {
        customer: { select: customerSelect },
      },
    });

    if (!request) return null;

    const unlock = await prisma.contactUnlock.findFirst({ where: { requestId, unlockedByUserId } });
    const customerContactsUnlocked = !!unlock;

    if (!customerContactsUnlocked) {
      request.customer.user.phone = maskPhoneNumber(request.customer.user.phone);
      request.customer.user.email = maskEmail(request.customer.user.email);
    }

    return { ...request, customerContactsUnlocked };
  },

  /**
   * Get all requests for a customer
   */
  async getByCustomerId(
    customerId: string,
    options?: {
      status?: RequestStatus;
      skip?: number;
      take?: number;
    }
  ) {
    const { status, skip = 0, take = 10 } = options || {};

    const where: any = { customerId, deletedAt: null };
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.transportRequest.findMany({
        where,
        include: {
          quotes: { select: { id: true, truckerId: true, status: true, totalPrice: true } },
          matches: { select: { id: true, truckerId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.transportRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      page: Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
    };
  },

  /**
   * Update a request (only if in DRAFT status)
   */
  async update(
    requestId: string,
    customerId: string,
    data: Partial<CreateTransportRequestInput>
  ): Promise<TransportRequest> {
    const existing = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
    });

    if (!existing) {
      throw new Error('Request not found or unauthorized');
    }

    if (existing.status !== 'DRAFT') {
      throw new Error('Can only update requests in DRAFT status');
    }

    const validated = createTransportRequestSchema.partial().parse(data);

    const updated = await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        ...(validated.material !== undefined && {
          materialDescription: sanitizeOptionalString(validated.material) || validated.material,
        }),
        ...(validated.quantity !== undefined && { quantity: validated.quantity }),
        ...(validated.unit !== undefined && { unit: validated.unit }),
        ...(validated.pickupCity !== undefined && { pickupCity: validated.pickupCity }),
        ...(validated.pickupSector !== undefined && {
          pickupSector: sanitizeOptionalString(validated.pickupSector),
        }),
        ...(validated.dropoffCity !== undefined && { dropoffCity: validated.dropoffCity }),
        ...(validated.dropoffSector !== undefined && {
          dropoffSector: sanitizeOptionalString(validated.dropoffSector),
        }),
        ...(validated.requestedDate !== undefined && { requestedDate: validated.requestedDate }),
        ...(validated.urgency !== undefined && { urgency: validated.urgency }),
        ...(validated.minCapacity !== undefined && { minCapacity: validated.minCapacity }),
        ...(validated.truckTypePreference !== undefined && {
          truckTypePreference: sanitizeOptionalString(validated.truckTypePreference),
        }),
        ...(validated.needsDriver !== undefined && { needsDriver: validated.needsDriver }),
        ...(validated.numberOfTrucks !== undefined && { numberOfTrucks: validated.numberOfTrucks }),
        ...(validated.budgetEstimate !== undefined && { budgetEstimate: validated.budgetEstimate }),
        ...(validated.comments !== undefined && { notes: sanitizeOptionalString(validated.comments) }),
      },
    });

    return updated;
  },

  /**
   * Publish a request (changes status from DRAFT to PUBLISHED)
   */
  async publish(requestId: string, customerId: string): Promise<TransportRequest> {
    const existing = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
    });

    if (!existing) {
      throw new Error('Request not found or unauthorized');
    }

    if (existing.status !== 'DRAFT') {
      throw new Error('Can only publish requests in DRAFT status');
    }

    return await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  },

  /**
   * Cancel a request
   */
  async cancel(requestId: string, customerId: string): Promise<TransportRequest> {
    const existing = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
    });

    if (!existing) {
      throw new Error('Request not found or unauthorized');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new Error(`Cannot cancel a ${existing.status} request`);
    }

    return await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
      },
    });
  },

  /**
   * Search published requests with filters (for truckers browsing available work)
   */
  async search(filters: {
    pickupCity?: string;
    dropoffCity?: string;
    skip?: number;
    take?: number;
  }) {
    const { skip = 0, take = 20 } = filters;

    const where: any = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (filters.pickupCity) where.pickupCity = filters.pickupCity;
    if (filters.dropoffCity) where.dropoffCity = filters.dropoffCity;

    const [requests, total] = await Promise.all([
      prisma.transportRequest.findMany({
        where,
        include: {
          customer: { select: customerSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.transportRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      page: Math.floor(skip / take) + 1,
      pages: Math.ceil(total / take),
    };
  },

  /**
   * Delete a request (soft delete)
   */
  async delete(requestId: string, customerId: string): Promise<void> {
    const existing = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
    });

    if (!existing) {
      throw new Error('Request not found or unauthorized');
    }

    await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        deletedAt: new Date(),
      },
    });
  },
};
