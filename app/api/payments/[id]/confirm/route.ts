import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/api-auth';
import { paymentServiceLayer } from '@/lib/services/payment-service';

/**
 * POST /api/payments/[id]/confirm
 * User confirms the mobile-money payment on the confirmation screen.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;

    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const payment = await paymentServiceLayer.confirm(paymentId, auth.userId);

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('[POST /api/payments/[id]/confirm]', error);

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
