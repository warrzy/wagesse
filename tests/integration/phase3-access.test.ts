import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { PrismaClient } from "@prisma/client"
import { generateToken, hashPassword } from "../../lib/auth"
import { POST as forgotPassword } from "../../app/api/auth/forgot-password/route"
import { POST as resetPassword } from "../../app/api/auth/reset-password/route"
import { POST as login } from "../../app/api/auth/login/route"
import { GET as adminLogs } from "../../app/api/admin/logs/route"
import { missionService } from "../../lib/services/mission-service"

const prisma = new PrismaClient()
let phoneSeq = 3000 + Math.floor(Math.random() * 1000)

function jsonRequest(path: string, body: unknown, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: token ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: token ? undefined : JSON.stringify(body),
  })
}

async function createUser(role: "CLIENT" | "TRUCKER" | "ADMIN", status: "ACTIVE" | "BLOCKED" = "ACTIVE") {
  phoneSeq += 1
  const phone = `7${String(phoneSeq).padStart(7, "0")}`
  const user = await prisma.user.create({
    data: {
      email: `${phone}@wagesse.test`,
      phone,
      password: await hashPassword("password123"),
      firstName: "Phase",
      lastName: role,
      role,
      status,
      phoneVerified: new Date(),
    },
  })
  if (role === "CLIENT") await prisma.customerProfile.create({ data: { userId: user.id, city: "Ouagadougou" } })
  if (role === "TRUCKER") await prisma.truckerProfile.create({ data: { userId: user.id, city: "Ouagadougou", truckerType: "INDEPENDENT_DRIVER" } })
  return user
}

test("un numéro inconnu et un compte existant reçoivent la même réponse de récupération", async () => {
  const env = process.env as { OTP_DEBUG_RETURN?: string }
  const previous = env.OTP_DEBUG_RETURN
  env.OTP_DEBUG_RETURN = "true"
  const user = await createUser("CLIENT")
  const unknown = await forgotPassword(jsonRequest("/api/auth/forgot-password", { phone: "70000000" }))
  const known = await forgotPassword(jsonRequest("/api/auth/forgot-password", { phone: user.phone }))
  env.OTP_DEBUG_RETURN = previous
  assert.equal(unknown.status, 200)
  assert.equal(known.status, 200)
  const unknownBody = await unknown.json()
  const knownBody = await known.json()
  assert.equal(unknownBody.message, knownBody.message)
  assert.equal(unknownBody.debugOtp, undefined)
  assert.equal(typeof knownBody.debugOtp, "string")
})

test("la réinitialisation change le mot de passe et un compte bloqué ne se connecte pas", async () => {
  const env = process.env as { OTP_DEBUG_RETURN?: string }
  env.OTP_DEBUG_RETURN = "true"
  const user = await createUser("CLIENT")
  const asked = await forgotPassword(jsonRequest("/api/auth/forgot-password", { phone: user.phone }))
  const code = (await asked.json()).debugOtp as string
  const reset = await resetPassword(jsonRequest("/api/auth/reset-password", { phone: user.phone, code, password: "nouveau123" }))
  assert.equal(reset.status, 200)
  const logged = await login(jsonRequest("/api/auth/login", { phone: user.phone, password: "nouveau123" }))
  assert.equal(logged.status, 200)

  const blocked = await createUser("CLIENT", "BLOCKED")
  const refused = await login(jsonRequest("/api/auth/login", { phone: blocked.phone, password: "password123" }))
  assert.equal(refused.status, 403)
})

test("un client ne lit pas le journal d'audit", async () => {
  const user = await createUser("CLIENT")
  const token = generateToken(user.id, user.email, "CLIENT")
  const response = await adminLogs(jsonRequest("/api/admin/logs", undefined, token))
  assert.equal(response.status, 401)
})

test("un camionneur ne peut pas clôturer une mission d'un bond", async () => {
  const client = await createUser("CLIENT")
  const trucker = await createUser("TRUCKER")
  const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: client.id } })
  const profile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: trucker.id } })
  const request = await prisma.transportRequest.create({
    data: {
      customerId: customer.id,
      materialDescription: "Sable",
      quantity: 4,
      unit: "TONNES",
      pickupCity: "Ouagadougou",
      dropoffCity: "Kaya",
      requestedDate: new Date(Date.now() + 86_400_000),
      status: "ASSIGNED",
    },
  })
  const vehicle = await prisma.vehicle.create({
    data: {
      truckerId: profile.id,
      licensePlate: `BF-${trucker.phone}`,
      brand: "Renault",
      model: "K",
      year: 2020,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 15,
    },
  })
  const mission = await prisma.mission.create({
    data: {
      requestId: request.id,
      customerId: customer.id,
      truckerId: profile.id,
      vehicleId: vehicle.id,
      missionReference: `MIS-${trucker.phone}`,
      contractPrice: 50000,
      scheduledDate: new Date(Date.now() + 86_400_000),
      pickupLocation: "Ouagadougou",
      dropoffLocation: "Kaya",
      status: "ACCEPTED",
    },
  })
  await assert.rejects(
    () => missionService.updateStatus(mission.id, profile.id, "TRUCKER", "COMPLETED", trucker.id),
    /Invalid transition/
  )
  const moved = await missionService.updateStatus(mission.id, profile.id, "TRUCKER", "TRUCK_EN_ROUTE_PICKUP", trucker.id)
  assert.equal(moved.status, "TRUCK_EN_ROUTE_PICKUP")
  const notice = await prisma.notification.findFirst({ where: { userId: client.id, title: "Mission mise à jour" } })
  assert.ok(notice)
})

test.after(async () => {
  await prisma.$disconnect()
})
