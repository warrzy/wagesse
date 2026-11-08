import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { PrismaClient } from "@prisma/client"
import { POST as signup } from "../../app/api/auth/signup/route"
import { POST as login } from "../../app/api/auth/login/route"
import { POST as purchase } from "../../app/api/credits/purchase/route"
import { POST as approve } from "../../app/api/admin/commandes/[id]/approve/route"
import { POST as createRequest } from "../../app/api/requests/route"
import { POST as publishRequest } from "../../app/api/requests/[id]/publish/route"
import { POST as createQuote } from "../../app/api/quotes/route"
import { POST as unlock } from "../../app/api/requests/[id]/unlock-contacts/route"
import { POST as acceptQuote } from "../../app/api/quotes/[id]/accept/route"
import { PATCH as missionStatus } from "../../app/api/missions/[id]/status/route"
import { GET as phonePolicy } from "../../app/api/auth/phone-verification/route"
import { hashPassword } from "../../lib/auth"

const prisma = new PrismaClient()
const password = "Simple123"
let seq = 7000 + Math.floor(Math.random() * 1000)

function post(path: string, body: unknown, token?: string) {
  return new NextRequest(`http://127.0.0.1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function json(response: Response) {
  return response.json() as Promise<{ success?: boolean; data?: any; error?: string; code?: string }>
}

test("le mode simple parcourt le métier sans SMS et le mode vérifié réapplique l'OTP", async () => {
  const previous = {
    PHONE_VERIFICATION_REQUIRED: process.env.PHONE_VERIFICATION_REQUIRED,
    NODE_ENV: process.env.NODE_ENV,
    SMS_PROVIDER: process.env.SMS_PROVIDER,
    SMS_HTTP_URL: process.env.SMS_HTTP_URL,
    SMS_HTTP_KEY: process.env.SMS_HTTP_KEY,
    SMS_ALLOW_SIMULATE: process.env.SMS_ALLOW_SIMULATE,
  }
  process.env.PHONE_VERIFICATION_REQUIRED = "false"
  Object.assign(process.env, { NODE_ENV: "test" })
  process.env.SMS_PROVIDER = "simulate"

  const phone = `79${String(seq).padStart(6, "0")}`
  const truckerPhone = `78${String(seq).padStart(6, "0")}`
  const created = await signup(post("/api/auth/signup", {
    phone,
    password,
    firstName: "Mode",
    lastName: "Simple",
    role: "CLIENT",
  }))
  const createdBody = await json(created)
  assert.equal(created.status, 201)
  assert.equal(createdBody.data.phoneVerificationRequired, false)
  assert.equal(createdBody.data.user.phoneVerified, null)
  assert.equal(createdBody.data.debugOtp, undefined)
  const clientToken = createdBody.data.token as string

  const signedIn = await login(post("/api/auth/login", { phone, password }))
  assert.equal(signedIn.status, 200)

  const trucker = await signup(post("/api/auth/signup", {
    phone: truckerPhone,
    password,
    firstName: "Mode",
    lastName: "Rouleau",
    role: "TRUCKER",
  }))
  const truckerBody = await json(trucker)
  assert.equal(trucker.status, 201)
  const truckerToken = truckerBody.data.token as string
  const truckerProfile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: truckerBody.data.user.id } })
  const plate = `AA-${seq}`
  const vehicle = await prisma.vehicle.create({
    data: {
      truckerId: truckerProfile.id,
      licensePlate: plate,
      brand: "Test",
      model: "Benne",
      year: 2020,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 20,
    },
  })

  const when = new Date(Date.now() + 86_400_000).toISOString()
  const request = await createRequest(post("/api/requests", {
    material: "Sable de mode simple",
    quantity: 8,
    unit: "TONNES",
    pickupCity: "Ouagadougou",
    dropoffCity: "Koudougou",
    requestedDate: when,
  }, clientToken))
  const requestBody = await json(request)
  assert.equal(request.status, 201, requestBody.error ?? "réponse sans message d'erreur")
  const requestId = requestBody.data.id as string
  const published = await publishRequest(post(`/api/requests/${requestId}/publish`, {}, clientToken), { params: Promise.resolve({ id: requestId }) })
  assert.equal(published.status, 200)

  const quote = await createQuote(post("/api/quotes", {
    requestId,
    vehicleId: vehicle.id,
    totalPrice: 90000,
    proposedDate: when,
    validUntil: when,
  }, truckerToken))
  const quoteBody = await json(quote)
  assert.equal(quote.status, 201, quoteBody.error ?? "réponse sans message d'erreur")
  const quoteId = quoteBody.data.id as string

  const pack = await prisma.creditPack.findFirstOrThrow({ where: { isActive: true, credits: { gt: 0 } } })
  const order = await purchase(post("/api/credits/purchase", { packCode: pack.code }, clientToken))
  const orderBody = await json(order)
  assert.equal(order.status, 201, orderBody.error ?? "réponse sans message d'erreur")
  const stillUnverified = await prisma.user.findUniqueOrThrow({ where: { phone }, select: { phoneVerified: true } })
  assert.equal(stillUnverified.phoneVerified, null)

  const admin = await prisma.user.create({
    data: {
      email: `admin-${phone}@wagesse.test`,
      phone: `77${String(seq).padStart(6, "0")}`,
      password: await hashPassword(password),
      firstName: "Admin",
      lastName: "Mode",
      role: "ADMIN",
      phoneVerified: null,
    },
  })
  const adminLogin = await login(post("/api/auth/login", { phone: admin.phone, password }))
  const adminToken = (await json(adminLogin)).data.token as string
  const approved = await approve(
    post(`/api/admin/commandes/${orderBody.data.order.id}/approve`, { note: "Validation de test" }, adminToken),
    { params: Promise.resolve({ id: orderBody.data.order.id }) }
  )
  assert.equal(approved.status, 200)
  const again = await approve(
    post(`/api/admin/commandes/${orderBody.data.order.id}/approve`, {}, adminToken),
    { params: Promise.resolve({ id: orderBody.data.order.id }) }
  )
  const againBody = await json(again)
  assert.equal(again.status, 200)
  assert.equal(againBody.data.alreadyProcessed, true)

  const opened = await unlock(post(`/api/requests/${requestId}/unlock-contacts`, {}, clientToken), { params: Promise.resolve({ id: requestId }) })
  assert.equal(opened.status, 200)
  const missionResponse = await acceptQuote(
    post(`/api/quotes/${quoteId}/accept`, {}, clientToken),
    { params: Promise.resolve({ id: quoteId }) }
  )
  const missionBody = await json(missionResponse)
  assert.equal(missionResponse.status, 201, missionBody.error ?? "réponse sans message d'erreur")
  const missionId = missionBody.data.id as string
  for (const status of ["TRUCK_EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "LOADING_IN_PROGRESS", "EN_ROUTE_DELIVERY", "ARRIVED_DELIVERY", "DELIVERED", "PENDING_CONFIRMATION"]) {
    const step = await missionStatus(
      new NextRequest(`http://127.0.0.1/api/missions/${missionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${truckerToken}` },
        body: JSON.stringify({ status }),
      }),
      { params: Promise.resolve({ id: missionId }) }
    )
    assert.equal(step.status, 200, status)
  }
  const closed = await missionStatus(
    new NextRequest(`http://127.0.0.1/api/missions/${missionId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({ status: "COMPLETED" }),
    }),
    { params: Promise.resolve({ id: missionId }) }
  )
  assert.equal(closed.status, 200)
  const stored = await prisma.mission.findUniqueOrThrow({ where: { id: missionId } })
  assert.equal(stored.status, "COMPLETED")

  process.env.PHONE_VERIFICATION_REQUIRED = "true"
  process.env.SMS_PROVIDER = "http"
  delete process.env.SMS_HTTP_URL
  delete process.env.SMS_HTTP_KEY
  const blockedConfig = await purchase(post("/api/credits/purchase", { packCode: pack.code }, clientToken))
  assert.equal(blockedConfig.status, 503)
  const refusedSignup = await signup(post("/api/auth/signup", {
    phone: `76${String(seq).padStart(6, "0")}`,
    password,
    firstName: "Mode",
    lastName: "Refuse",
    role: "CLIENT",
  }))
  assert.equal(refusedSignup.status, 503)
  assert.equal(await prisma.user.count({ where: { phone: `76${String(seq).padStart(6, "0")}` } }), 0)

  Object.assign(process.env, { NODE_ENV: "test" })
  process.env.SMS_PROVIDER = "simulate"
  const blockedOtp = await purchase(post("/api/credits/purchase", { packCode: pack.code }, clientToken))
  assert.equal(blockedOtp.status, 403)
  const afterMode = await prisma.user.findUniqueOrThrow({ where: { phone }, select: { phoneVerified: true } })
  assert.equal(afterMode.phoneVerified, null)

  const verifiedAt = new Date("2026-11-01T08:00:00.000Z")
  await prisma.user.update({ where: { phone }, data: { phoneVerified: verifiedAt } })
  const allowedWhenVerified = await purchase(post("/api/credits/purchase", { packCode: pack.code }, clientToken))
  assert.equal(allowedWhenVerified.status, 201)

  process.env.PHONE_VERIFICATION_REQUIRED = "false"
  const restored = await purchase(post("/api/credits/purchase", { packCode: pack.code }, clientToken))
  assert.equal(restored.status, 201)
  process.env.PHONE_VERIFICATION_REQUIRED = "true"
  const finalUser = await prisma.user.findUniqueOrThrow({ where: { phone }, select: { phoneVerified: true } })
  assert.equal(finalUser.phoneVerified?.toISOString(), verifiedAt.toISOString())
  process.env.PHONE_VERIFICATION_REQUIRED = "false"
  const policy = await json(await phonePolicy())
  assert.equal(policy.data.required, false)

  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
