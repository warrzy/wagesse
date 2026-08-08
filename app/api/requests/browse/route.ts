import { NextRequest, NextResponse } from 'next/server';
import { requestService } from '@/lib/services/request-service';
import { getAuthContext, unauthorized } from '@/lib/api-auth';

/**
 * GET /api/requests/browse?pickupCity=&dropoffCity=&skip=0&take=20
 * Browse published transport requests (for truckers looking for work)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const pickupCity = searchParams.get('pickupCity') || undefined;
    const dropoffCity = searchParams.get('dropoffCity') || undefined;
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '20', 10);

    const result = await requestService.search({ pickupCity, dropoffCity, skip, take });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[GET /api/requests/browse]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
