import { NextRequest, NextResponse } from 'next/server';
import { missionService } from '@/lib/services/mission-service';
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from '@/lib/api-auth';

/**
 * GET /api/missions/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;

    const auth = getAuthContext(request);
    if (!auth) return unauthorized();

    const mission = await missionService.getById(missionId);
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    const customerId = await getCustomerProfileId(auth.userId);
    const truckerId = await getTruckerProfileId(auth.userId);

    if (mission.customerId !== customerId && mission.truckerId !== truckerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: mission });
  } catch (error: any) {
    console.error('[GET /api/missions/[id]]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
