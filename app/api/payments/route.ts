import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getCustomerProfileId, unauthorized } from '@/lib/api-auth';
import { createPaymentSchema } from '@/lib/validations';
import { paymentServiceLayer } from '@/lib/services/payment-service';

/**
 * POST /api/payments
 * Initialize a payment (sandbox provider)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const validation = createPaymentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const customerId = await getCustomerProfileId(auth.userId);

    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('returnTo') || '/dashboard/client';

    const result = await paymentServiceLayer.initialize(
      auth.userId,
      customerId,
      validation.data,
      undefined,
      returnTo
    );

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error?.message === 'MANUAL_MODE') {
      return NextResponse.json(
        { success: false, error: "Les achats de crédits et de forfaits passent par une demande de règlement.", code: "MANUAL_MODE" },
        { status: 409 }
      );
    }
    if (error?.message === 'PAYDUNYA_DISABLED') {
      return NextResponse.json({ success: false, error: "PayDunya n'est pas activé", code: "PAYDUNYA_DISABLED" }, { status: 403 });
    }
    console.error('[POST /api/payments]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
