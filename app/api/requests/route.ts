import { NextRequest, NextResponse } from 'next/server';
import { requestService } from '@/lib/services/request-service';
import { getAuthContext, getCustomerProfileId, unauthorized } from '@/lib/api-auth';
import { RequestStatus } from '@prisma/client';

/**
 * GET /api/requests?status=DRAFT&skip=0&take=10
 * Get all requests for the authenticated customer
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const customerId = await getCustomerProfileId(auth.userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RequestStatus | null;
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '10', 10);

    const result = await requestService.getByCustomerId(customerId, {
      status: status || undefined,
      skip,
      take,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[GET /api/requests]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/requests
 * Create a new transport request
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const customerId = await getCustomerProfileId(auth.userId);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer profile not found' }, { status: 404 });
    }

    const body = await request.json();

    const result = await requestService.create(customerId, body);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/requests]', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
