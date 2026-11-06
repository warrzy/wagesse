import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { PrismaClient } from "@prisma/client"
import { generateToken, hashPassword } from "../../lib/auth"
import { GET as browseRequests } from "../../app/api/requests/browse/route"
import { GET as listQuotes } from "../../app/api/quotes/route"
import { POST as activatePlan } from "../../app/api/subscription/activate/route"
import { POST as purchaseCredits } from "../../app/api/credits/purchase/route"
import { GET as creditBalance } from "../../app/api/credits/balance/route"
import { commercialOrderService } from "../../lib/services/commercial-order-service"
import { paymentServiceLayer } from "../../lib/services/payment-service"
import { consumeCreditForUnlock } from "../../lib/services/credit-service"

const prisma = new PrismaClient()
const password = "password123"

function authRequest(path: string, token: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

let phoneSeq = Math.floor(Math.random() * 1000)

async function createUser(role: "CLIENT" | "TRUCKER" | "ADMIN", options?: { status?: "ACTIVE" | "BLOCKED"; verified?: boolean }) {
  phoneSeq = (phoneSeq + 1) % 10_000_000
  const phone = `8${String(phoneSeq).padStart(7, "0")}`
  const user = await prisma.user.create({
    data: {
      email: `${phone}@wagesse.test`,
      phone,
      password: await hashPassword(password),
      firstName: "Test",
      lastName: role,
      role,
      status: options?.status || "ACTIVE",
      phoneVerified: options?.verified === false ? null : new Date(),
    },
  })
  if (role === "CLIENT") {
    await prisma.customerProfile.create({ data: { userId: user.id, city: "Ouagadougou" } })
  }
  if (role === "TRUCKER") {
    await prisma.truckerProfile.create({ data: { userId: user.id, city: "Ouagadougou", truckerType: "INDEPENDENT_DRIVER" } })
  }
  return user
}

test("un compte bloqué est refusé sur une route protégée", async () => {
  const user = await createUser("CLIENT", { status: "BLOCKED" })
  const token = generateToken(user.id, user.email, "CLIENT")
  const response = await creditBalance(authRequest("/api/credits/balance", token))
  assert.equal(response.status, 401)
})

test("la liste des demandes ne révèle pas le téléphone du client", async () => {
  const client = await createUser("CLIENT")
  const trucker = await createUser("TRUCKER")
  const profile = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: client.id } })
  const request = await prisma.transportRequest.create({
    data: {
      customerId: profile.id,
      materialDescription: "Gravier",
      quantity: 10,
      unit: "TONNES",
      pickupCity: "Ouagadougou",
      dropoffCity: "Koudougou",
      requestedDate: new Date(Date.now() + 86_400_000),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  })
  const token = generateToken(trucker.id, trucker.email, "TRUCKER")
  const response = await browseRequests(authRequest("/api/requests/browse", token))
  assert.equal(response.status, 200)
  const payload = await response.json()
  const found = payload.data.requests.find((item: { id: string }) => item.id === request.id)
  assert.ok(found)
  assert.equal(found.customer.user.phone.includes(client.phone), false)
  assert.equal(JSON.stringify(found).includes(client.phone), false)
})

test("les devis ne révèlent pas le téléphone tant que le contact n'est pas débloqué", async () => {
  const client = await createUser("CLIENT")
  const trucker = await createUser("TRUCKER")
  const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: client.id } })
  const truckerProfile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: trucker.id } })
  const vehicle = await prisma.vehicle.create({
    data: {
      truckerId: truckerProfile.id,
      licensePlate: `BF-${trucker.phone}`,
      brand: "Isuzu",
      model: "FVR",
      year: 2020,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 15,
    },
  })
  const request = await prisma.transportRequest.create({
    data: {
      customerId: customer.id,
      materialDescription: "Sable",
      quantity: 5,
      unit: "TONNES",
      pickupCity: "Bobo-Dioulasso",
      dropoffCity: "Ouagadougou",
      requestedDate: new Date(Date.now() + 86_400_000),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  })
  await prisma.quote.create({
    data: {
      requestId: request.id,
      truckerId: truckerProfile.id,
      vehicleId: vehicle.id,
      totalPrice: 25000,
      proposedDate: new Date(Date.now() + 86_400_000),
      validUntil: new Date(Date.now() + 172_800_000),
    },
  })
  const token = generateToken(client.id, client.email, "CLIENT")
  const response = await listQuotes(authRequest(`/api/quotes?requestId=${request.id}`, token))
  const payload = await response.json()
  const body = JSON.stringify(payload)
  assert.equal(body.includes(trucker.phone), false)
  assert.equal(payload.data[0].locked, true)
  assert.equal(payload.data[0].totalPrice, undefined)
})

test("un forfait payant ne s'active pas sans règlement", async () => {
  const user = await createUser("CLIENT")
  const code = `PAID_${user.phone}`
  await prisma.subscriptionPlan.create({
    data: {
      code,
      name: "Payant test",
      tier: "pro",
      monthlyPrice: 5000,
      monthlyCredits: 10,
      isActive: true,
      isPublished: true,
      benefits: [],
      features: [],
    },
  })
  const token = generateToken(user.id, user.email, "CLIENT")
  const response = await activatePlan(authRequest("/api/subscription/activate", token, "POST", { planCode: code }))
  assert.equal(response.status, 403)
  const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: user.id } })
  const sub = await prisma.subscription.findFirst({ where: { customerId: customer.id, status: "ACTIVE" } })
  assert.equal(sub, null)
})

test("la confirmation sandbox en production n'attribue pas de crédits", async () => {
  const user = await createUser("CLIENT")
  const payment = await prisma.payment.create({
    data: {
      payer: user.id,
      amount: 1000,
      currency: "XOF",
      type: "CREDIT_PURCHASE",
      reference: `PAY-SBX-${user.phone}`,
      providerName: "orange_money",
      status: "PENDING",
      metadata: { sandbox: true, credits: 5, packCode: "TEST" },
    },
  })
  const env = process.env as { NODE_ENV?: string; PAYMENT_PROVIDER?: string }
  const previousEnv = env.NODE_ENV
  const previousProvider = env.PAYMENT_PROVIDER
  env.NODE_ENV = "production"
  env.PAYMENT_PROVIDER = "orange_money_sandbox"
  await assert.rejects(() => paymentServiceLayer.confirm(payment.id, user.id), /SANDBOX_DISABLED/)
  env.NODE_ENV = previousEnv
  env.PAYMENT_PROVIDER = previousProvider
  const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })
  assert.notEqual(fresh.status, "SUCCESSFUL")
  const wallet = await prisma.creditWallet.findUnique({ where: { userId: user.id } })
  assert.equal(wallet, null)
})

test("le circuit manuel fige la commande et n'attribue qu'une fois", async () => {
  const user = await createUser("CLIENT")
  const admin = await createUser("ADMIN")
  const code = `PACK_${user.phone}`
  await prisma.creditPack.create({
    data: { code, title: "Pack test", priceXof: 4000, credits: 5, isActive: true, sortOrder: 1 },
  })
  const token = generateToken(user.id, user.email, "CLIENT")
  const created = await purchaseCredits(authRequest("/api/credits/purchase", token, "POST", { packCode: code }))
  assert.equal(created.status, 201)
  const createdBody = await created.json()
  const orderId = createdBody.data.order.id as string
  const pendingWallet = await prisma.creditWallet.findUnique({ where: { userId: user.id } })
  assert.equal(pendingWallet, null)

  await prisma.creditPack.update({ where: { code }, data: { priceXof: 99999, credits: 99 } })
  const stored = await prisma.commercialOrder.findUniqueOrThrow({ where: { id: orderId } })
  assert.equal(stored.status, "PENDING")
  assert.equal(stored.amountXof, 4000)
  assert.equal(stored.credits, 5)

  const adminNote = await prisma.notification.findFirst({
    where: { userId: admin.id, message: { contains: stored.reference } },
  })
  assert.ok(adminNote)

  const [first, second] = await Promise.all([
    commercialOrderService.approve(orderId, admin.id, "règlement reçu"),
    commercialOrderService.approve(orderId, admin.id, "doublon"),
  ])
  assert.equal(first.alreadyProcessed || second.alreadyProcessed, true)
  const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })
  assert.equal(wallet.purchasedBalance, 5)
  assert.equal(wallet.balance, 5)
  const purchases = await prisma.creditTransaction.count({
    where: { walletId: wallet.id, type: "PURCHASE" },
  })
  assert.equal(purchases, 1)

  const again = await commercialOrderService.approve(orderId, admin.id, "encore")
  assert.equal(again.alreadyProcessed, true)
  const after = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })
  assert.equal(after.purchasedBalance, 5)

  const userNotice = await prisma.notification.findFirst({
    where: { userId: user.id, title: "Commande approuvée" },
  })
  assert.ok(userNotice)
})

test("un refus n'attribue rien", async () => {
  const user = await createUser("CLIENT")
  const admin = await createUser("ADMIN")
  const code = `PACKR_${user.phone}`
  await prisma.creditPack.create({
    data: { code, title: "Pack refus", priceXof: 1000, credits: 1, isActive: true },
  })
  const order = await commercialOrderService.createCreditPackOrder(user.id, code)
  await commercialOrderService.reject(order.id, admin.id, "règlement non reçu")
  const wallet = await prisma.creditWallet.findUnique({ where: { userId: user.id } })
  assert.equal(wallet, null)
  const fresh = await prisma.commercialOrder.findUniqueOrThrow({ where: { id: order.id } })
  assert.equal(fresh.status, "REJECTED")
})

test("deux déblocages simultanés ne débitent qu'une fois", async () => {
  const user = await createUser("CLIENT")
  const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: user.id } })
  const request = await prisma.transportRequest.create({
    data: {
      customerId: customer.id,
      materialDescription: "Terre",
      quantity: 2,
      unit: "TONNES",
      pickupCity: "Ouagadougou",
      dropoffCity: "Kaya",
      requestedDate: new Date(Date.now() + 86_400_000),
      status: "PUBLISHED",
    },
  })
  await prisma.creditWallet.create({
    data: { userId: user.id, balance: 2, purchasedBalance: 2, subscriptionBalance: 0 },
  })
  const results = await Promise.all([
    consumeCreditForUnlock({
      userId: user.id,
      requestId: request.id,
      amount: 1,
      resolveContacts: async () => [{ truckerId: "x" }],
    }),
    consumeCreditForUnlock({
      userId: user.id,
      requestId: request.id,
      amount: 1,
      resolveContacts: async () => [{ truckerId: "x" }],
    }),
  ])
  assert.equal(results.filter((item) => item.alreadyUnlocked).length >= 1, true)
  const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: user.id } })
  assert.equal(wallet.purchasedBalance, 1)
  const unlocks = await prisma.contactUnlock.count({ where: { requestId: request.id, unlockedByUserId: user.id } })
  assert.equal(unlocks, 1)
})

test.after(async () => {
  await prisma.$disconnect()
})
