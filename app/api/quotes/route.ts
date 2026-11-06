import { NextRequest, NextResponse } from 'next/server';
import { quoteService } from '@/lib/services/quote-service';
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { QuoteStatus } from '@prisma/client';
import { lockedQuoteView, maskContactUser } from '@/lib/contact-privacy';

/**
 * GET /api/quotes?requestId=xxx  -> quotes on one of the caller's own requests
 * GET /api/quotes (as a trucker) -> the caller's own quotes
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '10', 10);

    if (requestId) {
      const transportRequest = await prisma.transportRequest.findUnique({
        where: { id: requestId },
        select: { customerId: true },
      });

      if (!transportRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      const customerId = await getCustomerProfileId(auth.userId);
      if (customerId && transportRequest.customerId === customerId) {
        const result = await quoteService.getByRequestId(requestId);
        const unlock = await prisma.contactUnlock.findFirst({
          where: { requestId, unlockedByUserId: auth.userId },
          select: { id: true },
        });
        const data = unlock ? result : result.map((quote) => lockedQuoteView(quote));
        return NextResponse.json({ success: true, data });
      }

      const ownTruckerId = await getTruckerProfileId(auth.userId);
      if (ownTruckerId) {
        const allQuotes = await quoteService.getByRequestId(requestId);
        const ownQuote = allQuotes.filter((q) => q.truckerId === ownTruckerId);
        return NextResponse.json({ success: true, data: ownQuote });
      }

      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const truckerId = await getTruckerProfileId(auth.userId);
    if (!truckerId) {
      return NextResponse.json({ error: 'Trucker profile not found' }, { status: 404 });
    }

    const status = searchParams.get('status') as QuoteStatus | null;
    const result = await quoteService.getByTruckerId(truckerId, {
      status: status || undefined,
      skip,
      take,
    });

    const requestIds = result.quotes.map((quote) => quote.requestId);
    const unlocks = await prisma.contactUnlock.findMany({
      where: { unlockedByUserId: auth.userId, requestId: { in: requestIds } },
      select: { requestId: true },
    });
    const unlockedIds = new Set(unlocks.map((item) => item.requestId));
    const quotes = result.quotes.map((quote) => {
      if (unlockedIds.has(quote.requestId) || !quote.request?.customer?.user) return quote;
      return {
        ...quote,
        request: {
          ...quote.request,
          customer: {
            ...quote.request.customer,
            user: maskContactUser(quote.request.customer.user, true),
          },
        },
      };
    });

    return NextResponse.json({ success: true, data: { ...result, quotes } });
  } catch (error: any) {
    console.error('[GET /api/quotes]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotes
 * Create a new quote (trucker only)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const truckerId = await getTruckerProfileId(auth.userId);
    if (!truckerId) {
      return NextResponse.json({ error: 'Trucker profile not found' }, { status: 404 });
    }

    const body = await request.json();

    const result = await quoteService.create(truckerId, body);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/quotes]', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    if (
      error.message.includes('not found') ||
      error.message.includes('already quoted') ||
      error.message.includes('does not belong')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
