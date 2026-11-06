import { NextRequest, NextResponse } from 'next/server';
import { quoteService } from '@/lib/services/quote-service';
import { getAuthContext, getTruckerProfileId, unauthorized } from '@/lib/api-auth';

/**
 * POST /api/quotes/[id]/withdraw
 * Withdraw a quote (by trucker)
 */
export async function POST(
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

    const result = await quoteService.withdraw(quoteId, truckerId);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/quotes/[id]/withdraw]', error);

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
