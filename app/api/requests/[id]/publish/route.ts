import { NextRequest, NextResponse } from 'next/server';
import { requestService } from '@/lib/services/request-service';
import { getAuthContext, getCustomerProfileId, unauthorized } from '@/lib/api-auth';

/**
 * POST /api/requests/[id]/publish
 * Publish a request (change from DRAFT to PUBLISHED)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const customerId = await getCustomerProfileId(auth.userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const result = await requestService.publish(requestId, customerId);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[POST /api/requests/[id]/publish]', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message.includes('DRAFT')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
