import { NextRequest, NextResponse } from 'next/server';
import { quoteService } from '@/lib/services/quote-service';
import { getAuthContext, getCustomerProfileId, unauthorized } from '@/lib/api-auth';

/**
 * POST /api/quotes/[id]/reject
 * Reject a quote (by customer)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await params;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const customerId = await getCustomerProfileId(auth.userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const result = await quoteService.reject(quoteId, customerId);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/quotes/[id]/reject]', error);

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
