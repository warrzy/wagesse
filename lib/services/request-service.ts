import { prisma } from '@/lib/prisma';
import { createTransportRequestSchema, CreateTransportRequestInput } from '@/lib/validations';
import { TransportRequest, TransportRequestStatus } from '@prisma/client';

/**
 * Service for managing transport requests
 */
export const requestService = {
  /**
   * Create a new transport request
   */
  async create(
    userId: string,
    data: CreateTransportRequestInput
  ): Promise<TransportRequest> {
    // Validate input
    const validated = createTransportRequestSchema.parse(data);

    // Create request with associated materials
    const request = await prisma.transportRequest.create({
      data: {
        customerId: userId,
        pickupCity: validated.pickupCity,
        dropoffCity: validated.dropoffCity,
        pickupLatitude: validated.pickupLatitude,
        pickupLongitude: validated.pickupLongitude,
        dropoffLatitude: validated.dropoffLatitude,
        dropoffLongitude: validated.dropoffLongitude,
        pickupDate: new Date(validated.pickupDate),
        estimatedDistance: validated.estimatedDistance || 0,
        description: validated.description || '',
        status: 'DRAFT' as TransportRequestStatus,
        totalWeight: validated.totalWeight || 0,
        totalVolume: validated.totalVolume || 0,
        
        // Create associated materials
        materials: {
          create: validated.materials.map((material) => ({
            materialType: material.materialType,
            quantity: material.quantity,
            unit: material.unit,
            estimatedPrice: material.estimatedPrice || 0,
          })),
        },
      },
      include: {
        materials: true,
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return request;
  },

  /**
   * Get a single request by ID
   */
  async getById(requestId: string): Promise<TransportRequest | null> {
    return await prisma.transportRequest.findUnique({
      where: { id: requestId },
      include: {
        materials: true,
        customer: {
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
          },
        },
        quotes: {
          include: {
            trucker: {
              select: {
                id: true,
                name: true,
                phone: true,
                rating: true,
              },
            },
          },
        },
        matches: {
          include: {
            trucker: {
              select: {
                id: true,
                name: true,
                phone: true,
                rating: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Get all requests for a customer
   */
  async getByCustomerId(
    customerId: string,
    options?: {
      status?: TransportRequestStatus;
      skip?: number;
      take?: number;
    }
  ) {
    const { status, skip = 0, take = 10 } = options || {};

    const where: any = { customerId };
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.transportRequest.findMany({
        where,
        include: {
          materials: true,
          quotes: { select: { id: true, truckerId: true, status: true } },
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
    // Verify ownership
    const existing = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
    });

    if (!existing) {
      throw new Error('Request not found or unauthorized');
    }

    // Only allow updates in DRAFT status
    if (existing.status !== 'DRAFT') {
      throw new Error('Can only update requests in DRAFT status');
    }

    // Validate partial data
    const validated = createTransportRequestSchema.partial().parse(data);

    // Update request
    const updated = await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        ...(validated.pickupCity && { pickupCity: validated.pickupCity }),
        ...(validated.dropoffCity && { dropoffCity: validated.dropoffCity }),
        ...(validated.pickupLatitude && { pickupLatitude: validated.pickupLatitude }),
        ...(validated.pickupLongitude && { pickupLongitude: validated.pickupLongitude }),
        ...(validated.dropoffLatitude && { dropoffLatitude: validated.dropoffLatitude }),
        ...(validated.dropoffLongitude && { dropoffLongitude: validated.dropoffLongitude }),
        ...(validated.pickupDate && { pickupDate: new Date(validated.pickupDate) }),
        ...(validated.estimatedDistance && { estimatedDistance: validated.estimatedDistance }),
        ...(validated.description && { description: validated.description }),
        ...(validated.totalWeight && { totalWeight: validated.totalWeight }),
        ...(validated.totalVolume && { totalVolume: validated.totalVolume }),

        // Update materials if provided
        ...(validated.materials && {
          materials: {
            deleteMany: {},
            create: validated.materials.map((material) => ({
              materialType: material.materialType,
              quantity: material.quantity,
              unit: material.unit,
              estimatedPrice: material.estimatedPrice || 0,
            })),
          },
        }),
      },
      include: {
        materials: true,
      },
    });

    return updated;
  },

  /**
   * Publish a request (changes status from DRAFT to PUBLISHED)
   */
  async publish(requestId: string, customerId: string): Promise<TransportRequest> {
    // Verify ownership
    const existing = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
    });

    if (!existing) {
      throw new Error('Request not found or unauthorized');
    }

    if (existing.status !== 'DRAFT') {
      throw new Error('Can only publish requests in DRAFT status');
    }

    const published = await prisma.transportRequest.update({
      where: { id: requestId },
      data: {
        status: 'PUBLISHED' as TransportRequestStatus,
        publishedAt: new Date(),
      },
      include: {
        materials: true,
      },
    });

    return published;
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
        status: 'CANCELLED' as TransportRequestStatus,
      },
    });
  },

  /**
   * Search requests with filters
   */
  async search(filters: {
    pickupCity?: string;
    dropoffCity?: string;
    materialType?: string;
    minDistance?: number;
    maxDistance?: number;
    status?: TransportRequestStatus;
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
    if (filters.minDistance) where.estimatedDistance = { gte: filters.minDistance };
    if (filters.maxDistance) {
      if (where.estimatedDistance) {
        where.estimatedDistance.lte = filters.maxDistance;
      } else {
        where.estimatedDistance = { lte: filters.maxDistance };
      }
    }

    let results = await prisma.transportRequest.findMany({
      where,
      include: {
        materials: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    // Filter by materialType if provided
    if (filters.materialType) {
      results = results.filter((req) =>
        req.materials.some((m) => m.materialType === filters.materialType)
      );
    }

    const total = await prisma.transportRequest.count({ where });

    return {
      requests: results,
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
