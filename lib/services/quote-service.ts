import { prisma } from '@/lib/prisma';
import { createQuoteSchema, CreateQuoteInput } from '@/lib/validations';
import { Quote, QuoteStatus } from '@prisma/client';

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
    // Validate input
    const validated = createQuoteSchema.parse(data);

    // Verify the request exists and is PUBLISHED
    const request = await prisma.transportRequest.findUnique({
      where: { id: validated.requestId },
    });

    if (!request) {
      throw new Error('Transport request not found');
    }

    if (request.status !== 'PUBLISHED') {
      throw new Error('Can only quote on published requests');
    }

    // Check if trucker already quoted on this request
    const existingQuote = await prisma.quote.findFirst({
      where: {
        requestId: validated.requestId,
        truckerId,
      },
    });

    if (existingQuote) {
      throw new Error('You have already quoted on this request');
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        requestId: validated.requestId,
        truckerId,
        totalPrice: validated.totalPrice,
        currency: 'XOF',
        estimatedDays: validated.estimatedDays || 2,
        description: validated.description || '',
        status: 'PENDING' as QuoteStatus,
      },
      include: {
        request: true,
        trucker: {
          select: {
            id: true,
            name: true,
            phone: true,
            rating: true,
          },
        },
      },
    });

    return quote;
  },

  /**
   * Get a single quote by ID
   */
  async getById(quoteId: string): Promise<Quote | null> {
    return await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        request: {
          include: {
            materials: true,
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        trucker: {
          select: {
            id: true,
            name: true,
            phone: true,
            rating: true,
            acceptanceRate: true,
          },
        },
      },
    });
  },

  /**
   * Get all quotes for a request
   */
  async getByRequestId(requestId: string) {
    const quotes = await prisma.quote.findMany({
      where: { requestId },
      include: {
        trucker: {
          select: {
            id: true,
            name: true,
            phone: true,
            rating: true,
            averageResponseTime: true,
            acceptanceRate: true,
          },
        },
      },
      orderBy: { totalPrice: 'asc' }, // Sort by lowest price
    });

    return quotes;
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
              materials: true,
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
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
    // Get the quote
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        request: true,
      },
    });

    if (!quote) {
      throw new Error('Quote not found');
    }

    // Verify customer owns the request
    if (quote.request.customerId !== customerId) {
      throw new Error('Unauthorized');
    }

    // Verify quote status is PENDING
    if (quote.status !== 'PENDING') {
      throw new Error(`Cannot accept a ${quote.status} quote`);
    }

    // Create a mission
    const mission = await prisma.$transaction(async (tx) => {
      // Update quote status
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' as QuoteStatus },
      });

      // Create mission
      const newMission = await tx.mission.create({
        data: {
          requestId: quote.requestId,
          quoteId: quoteId,
          truckerId: quote.truckerId,
          totalPrice: quote.totalPrice,
          status: 'ACCEPTED',
          startDate: new Date(),
          estimatedEndDate: new Date(
            Date.now() + quote.estimatedDays * 24 * 60 * 60 * 1000
          ),
          description: quote.description,
        },
        include: {
          request: true,
          trucker: true,
          quote: true,
        },
      });

      // Reject all other quotes for this request
      await tx.quote.updateMany({
        where: {
          requestId: quote.requestId,
          id: { not: quoteId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' as QuoteStatus },
      });

      return newMission;
    });

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
      data: { status: 'REJECTED' as QuoteStatus },
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
      data: { status: 'WITHDRAWN' as QuoteStatus },
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
