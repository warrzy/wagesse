import { prisma } from '@/lib/prisma';
import { PaymentService, PaymentResponse } from '@/lib/payment-provider';
import { PayDunyaProvider } from '@/lib/paydunya';
import { generateReference } from '@/lib/auth';
import { CreatePaymentInput } from '@/lib/validations';
import { Payment, PaymentStatus } from '@prisma/client';
import { activateOrRenewSubscription } from '@/lib/services/subscription-service';
import { grantPurchasedCredits } from '@/lib/services/credit-service';
import { getPaymentMode } from '@/lib/payment-mode';
import { isOrangeSandboxProvider, sandboxAttributionBlocked } from '@/lib/payment-policy';

const orangePaymentService = new PaymentService();

function mapProviderStatus(status: PaymentResponse['status']): PaymentStatus {
  switch (status) {
    case 'success':
      return 'SUCCESSFUL';
    case 'failed':
      return 'FAILED';
    case 'pending':
    case 'initiated':
    default:
      return 'PENDING';
  }
}

const providerNameFor = (method: string) =>
  method === 'orange_money' ? 'orange_money' : method === 'mobile_money' ? 'mobile_money' : method === 'paydunya' ? 'paydunya' : 'stripe';

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}${path}`;
}

function paymentMetadata(payment: Payment): { sandbox?: boolean; credits?: number; packCode?: string; planCode?: string; notifToken?: string } {
  return (payment.metadata as { sandbox?: boolean; credits?: number; packCode?: string; planCode?: string; notifToken?: string } | null) || {};
}

export function assertSandboxCanGrant(payment: Payment) {
  if (sandboxAttributionBlocked(process.env, paymentMetadata(payment))) {
    throw new Error('SANDBOX_DISABLED');
  }
}

async function applySideEffects(tx: any, payment: Payment) {
  assertSandboxCanGrant(payment);
  const metadata = paymentMetadata(payment);

  if (payment.type === 'CREDIT_PURCHASE') {
    const credits = metadata.credits;
    if (!credits || credits <= 0) return;
    await grantPurchasedCredits(tx, {
      userId: payment.payer,
      credits,
      idempotencyKey: `payment:${payment.id}:purchase`,
      metadata: { paymentId: payment.id, packCode: metadata.packCode ?? null },
    });
    return;
  }

  if (payment.type === 'SUBSCRIPTION') {
    const planCode = metadata.planCode;
    if (!planCode) return;
    await activateOrRenewSubscription({
      userId: payment.payer,
      planCode,
      idempotencyKey: `payment:${payment.id}:subscription`,
      tx,
      requireActivePlan: true,
    });
  }
}

async function settleVerifiedPayment(payment: Payment, verifyResponse: PaymentResponse) {
  assertSandboxCanGrant(payment);
  const status = mapProviderStatus(verifyResponse.status);

  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!current) throw new Error('Payment not found');
      if (current.status === 'SUCCESSFUL' || current.status === 'FAILED' || current.status === 'REFUNDED') {
        return current;
      }

      if (status !== 'SUCCESSFUL') {
        return tx.payment.update({
          where: { id: payment.id },
          data: {
            status,
            ...(status === 'FAILED' && { failedAt: new Date() }),
          },
        });
      }

      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { notIn: ['SUCCESSFUL', 'FAILED', 'REFUNDED'] } },
        data: { status: 'SUCCESSFUL', confirmedAt: new Date() },
      });
      const updated = await tx.payment.findUnique({ where: { id: payment.id } });
      if (!updated) throw new Error('Payment not found');
      if (claimed.count !== 1) return updated;
      await applySideEffects(tx, updated);
      return updated;
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const current = await prisma.payment.findUnique({ where: { id: payment.id } });
      if (current) return current;
    }
    throw error;
  }
}

export const paymentServiceLayer = {
  async initialize(
    userId: string,
    customerId: string | null,
    data: CreatePaymentInput,
    metadata: Record<string, unknown> | undefined,
    returnTo: string
  ) {
    const mode = getPaymentMode();
    if (mode === 'MANUAL' && (data.type === 'CREDIT_PURCHASE' || data.type === 'SUBSCRIPTION')) {
      throw new Error('MANUAL_MODE');
    }
    if (mode === 'PAYDUNYA' && process.env.NODE_ENV === 'production' && process.env.PAYDUNYA_ENABLED !== 'true') {
      throw new Error('PAYDUNYA_DISABLED');
    }

    const reference = generateReference('PAY');
    const usePaydunya = mode === 'PAYDUNYA';
    const sandbox = !usePaydunya && isOrangeSandboxProvider();

    const payment = await prisma.payment.create({
      data: {
        payer: userId,
        customerId: customerId ?? undefined,
        amount: data.amount,
        currency: data.currency,
        type: data.type,
        reference,
        providerName: usePaydunya ? 'paydunya' : providerNameFor(data.paymentMethod),
        status: 'INITIATED',
        metadata: { ...(metadata || {}), sandbox, provider: usePaydunya ? 'paydunya' : 'orange' } as object,
      },
    });

    const ourReturnUrl = appUrl(
      usePaydunya
        ? `/api/payments/paydunya/return/${payment.id}?returnTo=${encodeURIComponent(returnTo)}`
        : `/api/payments/orange-money/return/${payment.id}?returnTo=${encodeURIComponent(returnTo)}`
    );

    const provider = usePaydunya ? new PayDunyaProvider() : null;
    const providerResponse = usePaydunya
      ? await provider!.charge({
          amount: data.amount,
          reference,
          currency: data.currency,
          customerPhone: data.phoneNumber,
          callbackUrl: ourReturnUrl,
          description: data.type,
        })
      : await orangePaymentService.processPayment({
          amount: data.amount,
          reference,
          currency: data.currency,
          customerPhone: data.phoneNumber,
          callbackUrl: ourReturnUrl,
        });

    const status = mapProviderStatus(providerResponse.status);

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        providerReference: providerResponse.providerReference,
        lastAttemptAt: new Date(),
        ...(status === 'FAILED' && { failedAt: new Date() }),
        metadata: {
          ...(metadata || {}),
          sandbox,
          provider: usePaydunya ? 'paydunya' : 'orange',
          ...(providerResponse.raw?.notifToken ? { notifToken: providerResponse.raw.notifToken } : {}),
        },
      },
    });

    await prisma.paymentAttempt.create({
      data: {
        paymentId: payment.id,
        attemptNumber: 1,
        status: providerResponse.status,
        errorMessage: providerResponse.errorMessage,
      },
    });

    const redirectUrl =
      providerResponse.redirectUrl ||
      (usePaydunya
        ? `/dashboard/client?payment=pending`
        : `/payments/${payment.id}/confirm?returnTo=${encodeURIComponent(returnTo)}`);

    return { payment: updated, redirectUrl };
  },

  async getById(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { attempts: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.payer !== userId) {
      throw new Error('Unauthorized');
    }

    return payment;
  },

  async confirm(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

    if (!payment) {
      throw new Error('Payment not found');
    }
    if (payment.payer !== userId) {
      throw new Error('Unauthorized');
    }
    if (payment.providerName === 'paydunya') {
      throw new Error('PAYDUNYA_CONFIRM');
    }
    assertSandboxCanGrant(payment);

    if (payment.status === 'SUCCESSFUL' || payment.status === 'FAILED') {
      return payment;
    }

    const verifyResponse = await orangePaymentService.verifyPayment(
      payment.providerReference || payment.reference
    );
    return settleVerifiedPayment(payment, verifyResponse);
  },

  async finalizeFromReturn(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new Error('Payment not found');
    }
    if (payment.providerName === 'paydunya') {
      return this.finalizePaydunya(payment.id);
    }
    assertSandboxCanGrant(payment);

    if (payment.status === 'SUCCESSFUL' || payment.status === 'FAILED') {
      return payment;
    }

    const verifyResponse = await orangePaymentService.verifyPayment(
      payment.providerReference || payment.reference,
      { orderId: payment.reference, amount: payment.amount }
    );
    return settleVerifiedPayment(payment, verifyResponse);
  },

  async finalizePaydunya(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment not found');
    if (payment.providerName !== 'paydunya' || !payment.providerReference) {
      throw new Error('Paiement PayDunya introuvable');
    }
    if (process.env.NODE_ENV === 'production' && process.env.PAYDUNYA_ENABLED !== 'true') {
      throw new Error('PAYDUNYA_DISABLED');
    }
    if (payment.status === 'SUCCESSFUL' || payment.status === 'FAILED') return payment;

    const provider = new PayDunyaProvider();
    const verifyResponse = await provider.verify(payment.providerReference, payment.amount);
    return settleVerifiedPayment(payment, verifyResponse);
  },

  async finalizeFromWebhook(orderId: string, orangeStatus: string, notifToken: string) {
    const payment = await prisma.payment.findUnique({ where: { reference: orderId } });
    if (!payment) {
      throw new Error('Payment not found for this order_id');
    }

    const storedToken = paymentMetadata(payment).notifToken;
    if (!storedToken || storedToken !== notifToken) {
      throw new Error('Invalid notif_token');
    }
    assertSandboxCanGrant(payment);

    if (payment.status === 'SUCCESSFUL' || payment.status === 'FAILED') {
      return payment;
    }

    const status = mapProviderStatus(
      orangeStatus?.toUpperCase() === 'SUCCESS'
        ? 'success'
        : orangeStatus?.toUpperCase() === 'FAILED' || orangeStatus?.toUpperCase() === 'EXPIRED'
          ? 'failed'
          : 'pending'
    );

    return settleVerifiedPayment(payment, {
      success: status === 'SUCCESSFUL',
      status: status === 'SUCCESSFUL' ? 'success' : status === 'FAILED' ? 'failed' : 'pending',
    });
  },
};
