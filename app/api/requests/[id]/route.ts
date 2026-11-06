import { NextRequest, NextResponse } from 'next/server';
import { requestService } from '@/lib/services/request-service';
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from '@/lib/api-auth';

/**
 * GET /api/requests/[id]
 * Get a single request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const customerId = await getCustomerProfileId(auth.userId);

    const full = await requestService.getById(requestId, auth.userId);
    if (!full) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (full.customerId === customerId) {
      return NextResponse.json({ success: true, data: full });
    }

    const truckerId = await getTruckerProfileId(auth.userId);
    if (truckerId) {
      const publicView = await requestService.getPublicByIdForUser(requestId, auth.userId);
      if (!publicView) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: publicView });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    console.error('[GET /api/requests/[id]]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/requests/[id]
 * Update a request (only in DRAFT status)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const customerId = await getCustomerProfileId(auth.userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const body = await request.json();

    const result = await requestService.update(requestId, customerId, body);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[PUT /api/requests/[id]]', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
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

/**
 * DELETE /api/requests/[id]
 * Delete (soft delete) a request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const customerId = await getCustomerProfileId(auth.userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    await requestService.delete(requestId, customerId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/requests/[id]]', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
