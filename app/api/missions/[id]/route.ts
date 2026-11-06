import { NextRequest, NextResponse } from 'next/server';
import { missionService } from '@/lib/services/mission-service';
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { maskContactUser } from '@/lib/contact-privacy';

/**
 * GET /api/missions/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;

    const auth = await getAuthContext(request);
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

    const unlock = await prisma.contactUnlock.findFirst({
      where: { requestId: mission.requestId, unlockedByUserId: auth.userId },
      select: { id: true },
    });
    let data = mission;
    if (!unlock && mission.customerId === customerId && mission.trucker?.user) {
      data = { ...mission, trucker: { ...mission.trucker, user: maskContactUser(mission.trucker.user, true) } };
    }
    if (!unlock && mission.truckerId === truckerId && mission.customer?.user) {
      data = { ...mission, customer: { ...mission.customer, user: maskContactUser(mission.customer.user, true) } };
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[GET /api/missions/[id]]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
