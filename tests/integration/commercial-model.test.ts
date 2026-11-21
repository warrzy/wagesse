import assert from "node:assert/strict"
import { describe, test } from "node:test"
import { NextRequest } from "next/server"
import { PrismaClient } from "@prisma/client"
import { generateToken, hashPassword } from "../../lib/auth"
import { POST as purchase } from "../../app/api/credits/purchase/route"
import { POST as approve } from "../../app/api/admin/commandes/[id]/approve/route"
import { POST as quote } from "../../app/api/quotes/route"
import { commercialOrderService } from "../../lib/services/commercial-order-service"
import { QUOTE_CREDIT_COST_KEY } from "../../lib/commercial-rules"

const prisma = new PrismaClient()
const password = "password123"
let phoneSeq = 4000000 + Math.floor(Math.random() * 1000)

function post(path: string, token: string, body?: unknown) {
  return new NextRequest(`http://127.0.0.1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function createUser(role: "CLIENT" | "TRUCKER" | "ADMIN" | "SUPER_ADMIN") {
  phoneSeq += 1
  const phone = `7${String(phoneSeq).padStart(7, "0")}`
  const user = await prisma.user.create({
    data: {
      email: `${phone}@wagesse.test`,
      phone,
      password: await hashPassword(password),
      firstName: "Crédit",
      lastName: role,
      role,
      status: "ACTIVE",
      phoneVerified: new Date(),
    },
  })
  if (role === "CLIENT") await prisma.customerProfile.create({ data: { userId: user.id, city: "Ouagadougou" } })
  if (role === "TRUCKER") {
    await prisma.truckerProfile.create({ data: { userId: user.id, city: "Ouagadougou", truckerType: "INDEPENDENT_DRIVER" } })
  }
  return user
}

describe("modèle commercial", { concurrency: 1 }, () => {
test("un client ne peut pas acheter, un admin ne peut pas approuver, un devis débite une fois", async () => {
  const client = await createUser("CLIENT")
  const trucker = await createUser("TRUCKER")
  const admin = await createUser("ADMIN")
  const superAdmin = await createUser("SUPER_ADMIN")
  const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: client.id } })
  const profile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: trucker.id } })
  const vehicle = await prisma.vehicle.create({
    data: {
      truckerId: profile.id,
      licensePlate: `CR-${phoneSeq}`,
      brand: "Test",
      model: "Benne",
      year: 2021,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 15,
    },
  })
  const request = await prisma.transportRequest.create({
    data: {
      customerId: customer.id,
      materialDescription: "Latérite",
      quantity: 12,
      unit: "TONNES",
      pickupCity: "Ouagadougou",
      dropoffCity: "Kaya",
      requestedDate: new Date(Date.now() + 86_400_000),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  })
  const when = new Date(Date.now() + 86_400_000).toISOString()
  const truckerToken = generateToken(trucker.id, trucker.email, "TRUCKER")
  const clientToken = generateToken(client.id, client.email, "CLIENT")
  const code = `PACKC_${phoneSeq}`
  await prisma.creditPack.create({
    data: { code, title: "Pack devis", priceXof: 2500, credits: 2, isActive: true },
  })

  const clientOrder = await purchase(post("/api/credits/purchase", clientToken, { packCode: code, credits: 99, priceXof: 1 }))
  assert.equal(clientOrder.status, 403)
  const pending = await quote(post("/api/quotes", truckerToken, {
    requestId: request.id,
    vehicleId: vehicle.id,
    totalPrice: 80000,
    proposedDate: when,
    validUntil: when,
  }))
  assert.equal(pending.status, 402)

  const bought = await purchase(post("/api/credits/purchase", truckerToken, { packCode: code, credits: 99, priceXof: 1 }))
  assert.equal(bought.status, 201)
  const boughtBody = await bought.json()
  assert.equal(boughtBody.data.order.credits, 2)
  assert.equal(boughtBody.data.order.amountXof, 2500)
  const before = await prisma.creditWallet.findUnique({ where: { userId: trucker.id } })
  assert.equal(before, null)

  const adminToken = generateToken(admin.id, admin.email, "ADMIN")
  const refused = await approve(
    post(`/api/admin/commandes/${boughtBody.data.order.id}/approve`, adminToken, { note: "non" }),
    { params: Promise.resolve({ id: boughtBody.data.order.id }) }
  )
  assert.equal(refused.status, 403)

  const superToken = generateToken(superAdmin.id, superAdmin.email, "SUPER_ADMIN")
  const [first, second] = await Promise.all([
    approve(post(`/api/admin/commandes/${boughtBody.data.order.id}/approve`, superToken, { note: "reçu" }), { params: Promise.resolve({ id: boughtBody.data.order.id }) }),
    approve(post(`/api/admin/commandes/${boughtBody.data.order.id}/approve`, superToken, { note: "doublon" }), { params: Promise.resolve({ id: boughtBody.data.order.id }) }),
  ])
  assert.equal(first.status === 200 || second.status === 200, true)
  const grants = await prisma.creditTransaction.count({
    where: { type: "PURCHASE", wallet: { userId: trucker.id } },
  })
  assert.equal(grants, 1)

  const sent = await Promise.all([
    quote(post("/api/quotes", truckerToken, {
      requestId: request.id,
      vehicleId: vehicle.id,
      totalPrice: 80000,
      proposedDate: when,
      validUntil: when,
    })),
    quote(post("/api/quotes", truckerToken, {
      requestId: request.id,
      vehicleId: vehicle.id,
      totalPrice: 81000,
      proposedDate: when,
      validUntil: when,
    })),
  ])
  assert.equal(sent.filter((item) => item.status === 201).length, 1)
  const quotes = await prisma.quote.count({ where: { requestId: request.id, truckerId: profile.id } })
  assert.equal(quotes, 1)
  const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: trucker.id } })
  assert.equal(wallet.balance, 1)
  assert.equal(wallet.balance >= 0, true)
  const debits = await prisma.creditTransaction.count({
    where: { type: "QUOTE_SUBMISSION", walletId: wallet.id },
  })
  assert.equal(debits, 1)

  const rejected = await commercialOrderService.createCreditPackOrder(trucker.id, code)
  await commercialOrderService.reject(rejected.id, superAdmin.id, "règlement absent")
  const afterReject = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: trucker.id } })
  assert.equal(afterReject.balance, 1)
})

test("un coût de devis enregistré est appliqué et une valeur navigateur est ignorée", async () => {
  await prisma.platformSetting.upsert({
    where: { key: QUOTE_CREDIT_COST_KEY },
    update: { value: 2, type: "number" },
    create: { key: QUOTE_CREDIT_COST_KEY, value: 2, type: "number", description: "test" },
  })
  try {
  const trucker = await createUser("TRUCKER")
  const client = await createUser("CLIENT")
  const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: client.id } })
  const profile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: trucker.id } })
  await prisma.creditWallet.create({
    data: { userId: trucker.id, balance: 2, purchasedBalance: 2, subscriptionBalance: 0 },
  })
  const vehicle = await prisma.vehicle.create({
    data: {
      truckerId: profile.id,
      licensePlate: `CT-${phoneSeq}`,
      brand: "Test",
      model: "Benne",
      year: 2022,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 10,
    },
  })
  const request = await prisma.transportRequest.create({
    data: {
      customerId: customer.id,
      materialDescription: "Gravier",
      quantity: 4,
      unit: "TONNES",
      pickupCity: "Bobo-Dioulasso",
      dropoffCity: "Banfora",
      requestedDate: new Date(Date.now() + 86_400_000),
      status: "PUBLISHED",
    },
  })
  const when = new Date(Date.now() + 86_400_000).toISOString()
  const token = generateToken(trucker.id, trucker.email, "TRUCKER")
  const sent = await quote(post("/api/quotes", token, {
    requestId: request.id,
    vehicleId: vehicle.id,
    totalPrice: 40000,
    proposedDate: when,
    validUntil: when,
    credits: 0,
  }))
  assert.equal(sent.status, 201)
  const wallet = await prisma.creditWallet.findUniqueOrThrow({ where: { userId: trucker.id } })
  assert.equal(wallet.balance, 0)
  } finally {
    await prisma.platformSetting.deleteMany({ where: { key: QUOTE_CREDIT_COST_KEY } })
  }
})
})

test.after(async () => {
  await prisma.$disconnect()
})
