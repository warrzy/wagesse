import { NextRequest, NextResponse } from 'next/server';
import { missionService } from '@/lib/services/mission-service';
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from '@/lib/api-auth';
import { MissionStatus } from '@prisma/client';

/**
 * GET /api/missions?status=IN_PROGRESS&skip=0&take=10
 * Get all missions for the authenticated user (as customer or trucker)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as MissionStatus | null;
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '10', 10);

    let profileId: string | null;
    let role: 'CLIENT' | 'TRUCKER';

    if (auth.role === 'TRUCKER') {
      role = 'TRUCKER';
      profileId = await getTruckerProfileId(auth.userId);
    } else {
      role = 'CLIENT';
      profileId = await getCustomerProfileId(auth.userId);
    }

    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const result = await missionService.getForUser(role, profileId, {
      status: status || undefined,
      skip,
      take,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[GET /api/missions]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
