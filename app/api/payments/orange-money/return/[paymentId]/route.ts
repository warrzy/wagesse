import { NextRequest, NextResponse } from 'next/server';
import { paymentServiceLayer } from '@/lib/services/payment-service';

function safeReturnTo(raw: string | null): string {
  // Only ever redirect to a same-site relative path — never let a query
  // param send the browser off-site.
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/dashboard/client';
  }
  return raw;
}

/**
 * GET /api/payments/orange-money/return/[paymentId]
 * The customer's browser lands here after completing (or cancelling) the
 * payment on Orange's hosted page. We verify the real status server-side
 * before trusting anything, then bounce back into the app.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const { searchParams } = new URL(request.url);
  const returnTo = safeReturnTo(searchParams.get('returnTo'));

  try {
    await paymentServiceLayer.finalizeFromReturn(paymentId);
  } catch (error: any) {
    console.error('[GET /api/payments/orange-money/return/[paymentId]]', error);
  }

  return NextResponse.redirect(new URL(returnTo, request.url));
}
