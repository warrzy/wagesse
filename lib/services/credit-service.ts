import { prisma } from "@/lib/prisma"

export type CreditTransactionType =
  | "PURCHASE"
  | "UNLOCK_CONTACT"
  | "SUBSCRIPTION_MONTHLY_TOPUP"
  | "ADMIN_ADJUSTMENT"
  | "PROMO"

function creditDb() {
  return prisma as any
}

export async function getOrCreateWallet(userId: string) {
  const db = creditDb()
  const existing = await db.creditWallet.findUnique({ where: { userId } })
  if (existing) return existing
  return await db.creditWallet.create({
    data: {
      userId,
      balance: 0,
      purchasedBalance: 0,
      subscriptionBalance: 0,
      subscriptionBalanceExpiresAt: null,
    },
  })
}

async function normalizeWalletForExpiry(tx: any, wallet: any) {
  const expiresAt: Date | null = wallet.subscriptionBalanceExpiresAt
  if (expiresAt && expiresAt.getTime() <= Date.now() && wallet.subscriptionBalance > 0) {
    const purchased = wallet.purchasedBalance ?? 0
    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        subscriptionBalance: 0,
        subscriptionBalanceExpiresAt: null,
        balance: purchased,
      },
    })
    return updated
  }
  return wallet
}

export async function getCreditBalances(userId: string): Promise<{
  total: number
  purchased: number
  subscription: number
  subscriptionExpiresAt: Date | null
}> {
  const db = creditDb()
  const wallet = await getOrCreateWallet(userId)

  const expiresAt: Date | null = wallet.subscriptionBalanceExpiresAt
  const subscriptionValid = !expiresAt || expiresAt.getTime() > Date.now()
  const purchased = wallet.purchasedBalance ?? wallet.balance ?? 0
  const subscription = subscriptionValid ? wallet.subscriptionBalance ?? 0 : 0
  const total = purchased + subscription

  return {
    total,
    purchased,
    subscription,
    subscriptionExpiresAt: subscriptionValid ? expiresAt : null,
  }
}

export async function getCreditBalance(userId: string): Promise<number> {
  const b = await getCreditBalances(userId)
  return b.total
}

export async function spendCredit(params: {
  userId: string
  amount: number
  type: CreditTransactionType
  metadata?: Record<string, unknown>
}) {
  const { userId, amount, type, metadata } = params
  if (amount <= 0) throw new Error("Invalid amount")

  const db = creditDb()

  return await db.$transaction(async (tx: any) => {
    const initialWallet = await tx.creditWallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        balance: 0,
        purchasedBalance: 0,
        subscriptionBalance: 0,
        subscriptionBalanceExpiresAt: null,
      },
    })

    const wallet = await normalizeWalletForExpiry(tx, initialWallet)

    const purchased = wallet.purchasedBalance ?? 0
    const subscription = wallet.subscriptionBalance ?? 0
    const total = purchased + subscription

    if (total < amount) {
      return { success: false as const, wallet }
    }

    const subscriptionSpend = Math.min(subscription, amount)
    const remaining = amount - subscriptionSpend
    const purchasedSpend = remaining

    const newSubscriptionBalance = subscription - subscriptionSpend
    const newPurchasedBalance = purchased - purchasedSpend
    const newBalance = newSubscriptionBalance + newPurchasedBalance

    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        subscriptionBalance: newSubscriptionBalance,
        purchasedBalance: newPurchasedBalance,
        balance: newBalance,
      },
    })

    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: -amount,
        balanceAfter: newBalance,
        metadata: (metadata ?? undefined) as any,
      },
    })

    return { success: true as const, wallet: updated }
  })
}
