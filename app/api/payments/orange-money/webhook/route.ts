import { NextRequest, NextResponse } from 'next/server';
import { paymentServiceLayer } from '@/lib/services/payment-service';

/**
 * POST /api/payments/orange-money/webhook
 * Orange Money's server-to-server notification (notif_url). This is the
 * authoritative confirmation channel — the browser return can be lost if
 * the customer closes the tab, this call shouldn't be.
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, unknown>;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }

    const orderId = String(body.order_id || '');
    const status = String(body.status || '');
    const notifToken = String(body.notif_token || '');

    if (!orderId || !notifToken) {
      return NextResponse.json({ error: 'Missing order_id or notif_token' }, { status: 400 });
    }

    await paymentServiceLayer.finalizeFromWebhook(orderId, status, notifToken);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/payments/orange-money/webhook]', error);
    // Still 200 so Orange doesn't retry indefinitely on our data errors,
    // but surface the message for our own logs.
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
