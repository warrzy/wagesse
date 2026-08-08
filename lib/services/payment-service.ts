import { prisma } from '@/lib/prisma';
import { PaymentService, PaymentResponse } from '@/lib/payment-provider';
import { generateReference } from '@/lib/auth';
import { CreatePaymentInput } from '@/lib/validations';
import { Payment, PaymentStatus } from '@prisma/client';
import { activateOrRenewSubscription } from '@/lib/services/subscription-service';

const paymentService = new PaymentService();

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
  method === 'orange_money' ? 'orange_money' : method === 'mobile_money' ? 'mobile_money' : 'stripe';

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${base}${path}`;
}

/**
 * Runs whatever side effect a successful payment is supposed to trigger.
 * Shared between the user-facing sandbox confirm flow, the real Orange
 * Money browser return, and the Orange Money server-to-server webhook —
 * all three must be safe to call more than once for the same payment.
 */
async function applySideEffects(payment: Payment) {
  if (payment.type === 'CREDIT_PURCHASE') {
    const metadata = payment.metadata as { credits?: number; packCode?: string } | null;
    const credits = metadata?.credits;
    if (!credits || credits <= 0) return;

    const existing = await prisma.creditTransaction.findFirst({
      where: {
        type: 'PURCHASE',
        wallet: { userId: payment.payer },
        metadata: { path: ['paymentId'], equals: payment.id },
      } as any,
    });
    if (existing) return;

    await prisma.$transaction(async (tx) => {
      const wallet = await (tx as any).creditWallet.upsert({
        where: { userId: payment.payer },
        update: {},
        create: {
          userId: payment.payer,
          balance: 0,
          purchasedBalance: 0,
          subscriptionBalance: 0,
          subscriptionBalanceExpiresAt: null,
        },
      });

      const purchased = wallet.purchasedBalance ?? wallet.balance ?? 0;
      const subscription = wallet.subscriptionBalance ?? 0;
      const newPurchased = purchased + credits;
      const newBalance = newPurchased + subscription;

      await (tx as any).creditWallet.update({
        where: { id: wallet.id },
        data: { purchasedBalance: newPurchased, balance: newBalance },
      });

      await (tx as any).creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PURCHASE',
          amount: credits,
          balanceAfter: newBalance,
          metadata: { paymentId: payment.id, packCode: metadata?.packCode ?? null },
        },
      });
    });

    return;
  }

  if (payment.type === 'SUBSCRIPTION') {
    const metadata = payment.metadata as { planCode?: string } | null;
    const planCode = metadata?.planCode;
    if (!planCode) return;
    await activateOrRenewSubscription({ userId: payment.payer, planCode });
    return;
  }
}

export const paymentServiceLayer = {
  /**
   * Start a payment.
   * - Sandbox provider: stays PENDING until the user confirms it on our
   *   internal mock screen (redirectUrl points there).
   * - Real Orange Money: the provider itself returns a hosted `payment_url`;
   *   the customer completes payment on Orange's site, not ours.
   *
   * `returnTo` is the in-app page to bounce back to once the payment (real
   * or simulated) is confirmed.
   */
  async initialize(
    userId: string,
    customerId: string | null,
    data: CreatePaymentInput,
    metadata: Record<string, unknown> | undefined,
    returnTo: string
  ) {
    const reference = generateReference('PAY');

    const payment = await prisma.payment.create({
      data: {
        payer: userId,
        customerId: customerId ?? undefined,
        amount: data.amount,
        currency: data.currency,
        type: data.type,
        reference,
        providerName: providerNameFor(data.paymentMethod),
        status: 'INITIATED',
        metadata: metadata as object | undefined,
      },
    });

    const ourReturnUrl = appUrl(
      `/api/payments/orange-money/return/${payment.id}?returnTo=${encodeURIComponent(returnTo)}`
    );

    const providerResponse = await paymentService.processPayment({
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
          ...(metadata as object | undefined),
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

    // Real Orange Money hands us its own hosted payment_url; fall back to
    // our sandbox confirmation screen when the provider doesn't give one.
    const redirectUrl =
      providerResponse.redirectUrl ||
      `/payments/${payment.id}/confirm?returnTo=${encodeURIComponent(returnTo)}`;

    return { payment: updated, redirectUrl };
  },

  /**
   * Read-only fetch — no provider calls, no side effects.
   */
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

  /**
   * Sandbox confirmation screen: the user themself confirms, authenticated
   * by their session.
   */
  async confirm(paymentId: string, userId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

    if (!payment) {
      throw new Error('Payment not found');
    }
    if (payment.payer !== userId) {
      throw new Error('Unauthorized');
    }

    if (payment.status === 'SUCCESSFUL' || payment.status === 'FAILED') {
      return payment;
    }

    const verifyResponse = await paymentService.verifyPayment(
      payment.providerReference || payment.reference
    );
    const status = mapProviderStatus(verifyResponse.status);

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(status === 'SUCCESSFUL' && { confirmedAt: new Date() }),
        ...(status === 'FAILED' && { failedAt: new Date() }),
      },
    });

    if (status === 'SUCCESSFUL') {
      await applySideEffects(updated);
    }

    return updated;
  },

  /**
   * Real Orange Money browser return: the customer is bounced back from
   * Orange's hosted payment page. No user auth context is available here
   * (it's a plain redirect), so we verify server-side against Orange's
   * transaction-status API using the payment's own reference/amount.
   */
  async finalizeFromReturn(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'SUCCESSFUL' || payment.status === 'FAILED') {
      return payment;
    }

    const verifyResponse = await paymentService.verifyPayment(
      payment.providerReference || payment.reference,
      { orderId: payment.reference, amount: payment.amount }
    );
    const status = mapProviderStatus(verifyResponse.status);

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(status === 'SUCCESSFUL' && { confirmedAt: new Date() }),
        ...(status === 'FAILED' && { failedAt: new Date() }),
      },
    });

    if (status === 'SUCCESSFUL') {
      await applySideEffects(updated);
    }

    return updated;
  },

  /**
   * Real Orange Money server-to-server webhook (notif_url). Orange sends
   * the final status directly, so no extra verify call is needed — but we
   * do check the notif_token we stored at creation time before trusting it.
   */
  async finalizeFromWebhook(orderId: string, orangeStatus: string, notifToken: string) {
    const payment = await prisma.payment.findUnique({ where: { reference: orderId } });
    if (!payment) {
      throw new Error('Payment not found for this order_id');
    }

    const storedToken = (payment.metadata as { notifToken?: string } | null)?.notifToken;
    if (!storedToken || storedToken !== notifToken) {
      throw new Error('Invalid notif_token');
    }

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

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        ...(status === 'SUCCESSFUL' && { confirmedAt: new Date() }),
        ...(status === 'FAILED' && { failedAt: new Date() }),
      },
    });

    if (status === 'SUCCESSFUL') {
      await applySideEffects(updated);
    }

    return updated;
  },
};
