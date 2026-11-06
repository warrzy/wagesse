import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getCustomerProfileId, requireVerifiedPhone, unauthorized } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { consumeCreditForUnlock } from '@/lib/services/credit-service';
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

    const auth = await getAuthContext(request);
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

    const phoneGate = await requireVerifiedPhone(auth.userId);
    if (phoneGate) return phoneGate;

    const unlockCost = await getUnlockCostCreditsForUser(auth.userId);
    const spend = await consumeCreditForUnlock({
      userId: auth.userId,
      requestId,
      amount: unlockCost,
      resolveContacts: async (tx) => {
        const quotes = await tx.quote.findMany({ where: { requestId }, select: { truckerId: true } });
        return quotes.map((quote: { truckerId: string }) => ({ truckerId: quote.truckerId }));
      },
    });

    if (spend.alreadyUnlocked) {
      return NextResponse.json({ success: true, data: { alreadyUnlocked: true } });
    }
    if ("insufficient" in spend && spend.insufficient) {
      return NextResponse.json(
        { success: false, error: "Vous n'avez plus suffisamment de crédits.", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    return NextResponse.json({ success: true, data: { alreadyUnlocked: false, unlocked: true } });
  } catch (error: any) {
    console.error('[POST /api/requests/[id]/unlock-contacts]', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
