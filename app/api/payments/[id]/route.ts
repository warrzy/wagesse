import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, unauthorized } from '@/lib/api-auth';
import { paymentServiceLayer } from '@/lib/services/payment-service';

/**
 * GET /api/payments/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;

    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const payment = await paymentServiceLayer.getById(paymentId, auth.userId);

    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('[GET /api/payments/[id]]', error);

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
