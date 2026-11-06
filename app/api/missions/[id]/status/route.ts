import { NextRequest, NextResponse } from 'next/server';
import { missionService } from '@/lib/services/mission-service';
import { getAuthContext, getCustomerProfileId, getTruckerProfileId, unauthorized } from '@/lib/api-auth';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum([
    'DRAFT', 'PENDING_PAYMENT', 'PAID', 'PENDING_ACCEPTANCE', 'ACCEPTED',
    'TRUCK_EN_ROUTE_PICKUP', 'ARRIVED_PICKUP', 'LOADING_IN_PROGRESS',
    'EN_ROUTE_DELIVERY', 'ARRIVED_DELIVERY', 'DELIVERED', 'PENDING_CONFIRMATION',
    'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED',
  ]),
});

/**
 * PATCH /api/missions/[id]/status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: missionId } = await params;

    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

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

    const result = await missionService.updateStatus(
      missionId,
      profileId,
      role,
      validation.data.status,
      auth.userId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[PATCH /api/missions/[id]/status]', error);

    if (error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error.message.includes('Cannot change status')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
