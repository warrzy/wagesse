import { NextRequest, NextResponse } from 'next/server';
import { quoteService } from '@/lib/services/quote-service';
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, isAdminRole, unauthorized } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { lockedQuoteView, maskContactUser } from '@/lib/contact-privacy';
import { z } from 'zod';

const updateQuotePriceSchema = z.object({
  totalPrice: z.number().positive('Le prix doit être positif'),
});

/**
 * PUT /api/quotes/[id]
 * Update a quote's price (trucker only, while PENDING)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const truckerId = await getTruckerProfileId(auth.userId);
    if (!truckerId) {
      return NextResponse.json({ error: 'Trucker profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateQuotePriceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const result = await quoteService.updatePrice(quoteId, truckerId, validation.data.totalPrice);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[PUT /api/quotes/[id]]', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quotes/[id]
 * Get a single quote (customer who owns the request, or the trucker who made it)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const quote = await quoteService.getById(quoteId);
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (isAdminRole(auth.role)) {
      return NextResponse.json({ success: true, data: quote });
    }

    const customerId = await getCustomerProfileId(auth.userId);
    const truckerId = await getTruckerProfileId(auth.userId);
    const ownsRequest = customerId !== null && quote.request.customerId === customerId;
    const authored = truckerId !== null && quote.truckerId === truckerId;
    if (!ownsRequest && !authored) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const unlock = await prisma.contactUnlock.findFirst({
      where: { requestId: quote.requestId, unlockedByUserId: auth.userId },
      select: { id: true },
    });

    if (ownsRequest && !unlock) {
      return NextResponse.json({ success: true, data: lockedQuoteView(quote) });
    }

    if (authored && !unlock && quote.request.customer?.user) {
      return NextResponse.json({
        success: true,
        data: {
          ...quote,
          request: {
            ...quote.request,
            customer: {
              ...quote.request.customer,
              user: maskContactUser(quote.request.customer.user, true),
            },
          },
        },
      });
    }

    return NextResponse.json({ success: true, data: quote });
  } catch (error: any) {
    console.error('[GET /api/quotes/[id]]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
