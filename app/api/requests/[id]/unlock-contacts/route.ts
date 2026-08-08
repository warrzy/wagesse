import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getCustomerProfileId, unauthorized } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { spendCredit } from '@/lib/services/credit-service';
import { getUnlockCostCreditsForUser } from '@/lib/services/subscription-service';

/**
 * POST /api/requests/[id]/unlock-contacts
 * Unlock contacts for a request using credits.
 * Debits 1 credit from the initiator and stores the unlock so it is never charged twice.
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

    const transportRequest = await prisma.transportRequest.findFirst({
      where: { id: requestId, customerId },
    });
    if (!transportRequest) {
      return NextResponse.json({ error: 'Request not found or unauthorized' }, { status: 404 });
    }

    const existingUnlock = await prisma.contactUnlock.findFirst({ where: { requestId, unlockedByUserId: auth.userId } });
    if (existingUnlock) {
      return NextResponse.json({ success: true, data: { alreadyUnlocked: true } });
    }

    const unlockCost = await getUnlockCostCreditsForUser(auth.userId);

    const spend = await spendCredit({
      userId: auth.userId,
      amount: unlockCost,
      type: "UNLOCK_CONTACT",
      metadata: { requestId },
    });

    if (!spend.success) {
      return NextResponse.json(
        { success: false, error: "Vous n'avez plus suffisamment de crédits.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    const quotes = await prisma.quote.findMany({ where: { requestId }, select: { truckerId: true } });
    await prisma.contactUnlock.create({
      data: {
        requestId,
        unlockedByUserId: auth.userId,
        unlockedContacts: quotes.map((q) => ({ truckerId: q.truckerId })),
      },
    });

    return NextResponse.json({ success: true, data: { alreadyUnlocked: false, unlocked: true } });
  } catch (error: any) {
    console.error('[POST /api/requests/[id]/unlock-contacts]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
