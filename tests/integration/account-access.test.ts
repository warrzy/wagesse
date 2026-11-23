import assert from "node:assert/strict"
import test from "node:test"
import { NextRequest } from "next/server"
import { PrismaClient } from "@prisma/client"
import { generateToken, hashPassword } from "../../lib/auth"
import { POST as login } from "../../app/api/auth/login/route"
import { POST as signup } from "../../app/api/auth/signup/route"
import { POST as forgotPassword } from "../../app/api/auth/forgot-password/route"
import { POST as changePassword } from "../../app/api/auth/change-password/route"
import { GET as browse } from "../../app/api/requests/browse/route"
import { GET as getRequest } from "../../app/api/requests/[id]/route"
import { POST as unlockCustomer } from "../../app/api/requests/[id]/unlock-customer-contact/route"
import { GET as contacts } from "../../app/api/contacts/route"
import { POST as createQuote } from "../../app/api/quotes/route"
import { GET as getQuote } from "../../app/api/quotes/[id]/route"
import { POST as acceptQuote } from "../../app/api/quotes/[id]/accept/route"
import { GET as getMission } from "../../app/api/missions/[id]/route"
import { GET as customerProfile } from "../../app/api/profile/customer/route"
import { GET as adminUsers } from "../../app/api/admin/utilisateurs/route"
import { GET as findAccount, POST as resetPassword } from "../../app/api/admin/mots-de-passe/route"
import { sendAccountEmail } from "../../lib/mail"

const prisma = new PrismaClient()
const password = "password123"
let seq = 6000000 + (Date.now() % 100000)

function call(path: string, method: string, token?: string, body?: unknown) {
  return new NextRequest(`http://127.0.0.1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function createUser(role: "CLIENT" | "TRUCKER" | "ADMIN" | "SUPER_ADMIN", email?: string) {
  seq += 1
  const phone = `6${String(seq).padStart(7, "0")}`
  const user = await prisma.user.create({
    data: {
      email: email || `${phone}@wagesse.test`,
      phone,
      password: await hashPassword(password),
      firstName: "Accès",
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

async function publishedRequest(customerId: string) {
  return prisma.transportRequest.create({
    data: {
      customerId,
      materialDescription: "Gravier",
      quantity: 8,
      unit: "TONNES",
      pickupCity: "Ouagadougou",
      dropoffCity: "Bobo-Dioulasso",
      requestedDate: new Date(Date.now() + 86_400_000),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  })
}

test("connexion par téléphone, par e-mail, et refus d'un mauvais mot de passe", async () => {
  const user = await createUser("CLIENT")
  const byPhone = await login(call("/api/auth/login", "POST", undefined, { phone: user.phone, password }))
  const byEmail = await login(call("/api/auth/login", "POST", undefined, { identifier: user.email.toUpperCase(), password }))
  const wrong = await login(call("/api/auth/login", "POST", undefined, { identifier: user.email, password: "mauvais123" }))
  assert.equal(byPhone.status, 200)
  assert.equal(byEmail.status, 200)
  assert.equal((await byPhone.json()).data.user.id, user.id)
  assert.equal((await byEmail.json()).data.user.id, user.id)
  assert.equal(wrong.status, 401)
})

test("une collision d'identifiants ne connecte aucun des comptes", async () => {
  seq += 1
  const local = `6${String(seq).padStart(7, "0")}`
  const first = await createUser("CLIENT", `${local}@une.example`)
  await prisma.user.update({ where: { id: first.id }, data: { phone: local } })
  const second = await createUser("TRUCKER", `${local}@autre.example`)
  await prisma.user.update({ where: { id: second.id }, data: { phone: `226${local}` } })
  const response = await login(call("/api/auth/login", "POST", undefined, { identifier: local, password }))
  assert.equal(response.status, 401)
  const body = await response.json()
  assert.equal(body.data, undefined)
})

test("inscription sans SMS et sans e-mail", async () => {
  const env = process.env as { PHONE_VERIFICATION_REQUIRED?: string }
  const previous = env.PHONE_VERIFICATION_REQUIRED
  env.PHONE_VERIFICATION_REQUIRED = "false"
  seq += 1
  const phone = `6${String(seq).padStart(7, "0")}`
  const response = await signup(call("/api/auth/signup", "POST", undefined, {
    phone,
    password: "nouveau123",
    firstName: "Awa",
    lastName: "Test",
    role: "CLIENT",
  }))
  if (previous === undefined) delete env.PHONE_VERIFICATION_REQUIRED
  else env.PHONE_VERIFICATION_REQUIRED = previous
  assert.equal(response.status, 201)
  const body = await response.json()
  assert.equal(body.data.debugOtp, undefined)
  assert.equal(body.data.phoneVerificationRequired, false)
  const created = await prisma.user.findUniqueOrThrow({ where: { phone } })
  assert.equal(created.email, `${phone}@wagesse.local`)
})

test("les coordonnées restent masquées tant que le devis n'est pas accepté", async () => {
  const client = await createUser("CLIENT")
  const poor = await createUser("TRUCKER")
  const rich = await createUser("TRUCKER")
  const other = await createUser("TRUCKER")
  const customer = await prisma.customerProfile.findUniqueOrThrow({ where: { userId: client.id } })
  const poorProfile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: poor.id } })
  const richProfile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: rich.id } })
  const otherProfile = await prisma.truckerProfile.findUniqueOrThrow({ where: { userId: other.id } })
  const request = await publishedRequest(customer.id)
  const when = new Date(Date.now() + 86_400_000).toISOString()
  const poorVehicle = await prisma.vehicle.create({
    data: {
      truckerId: poorProfile.id,
      licensePlate: `AB-${seq}`,
      brand: "Test",
      model: "Benne",
      year: 2022,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 15,
    },
  })
  const vehicle = await prisma.vehicle.create({
    data: {
      truckerId: richProfile.id,
      licensePlate: `AC-${seq}`,
      brand: "Test",
      model: "Benne",
      year: 2022,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 15,
    },
  })
  const otherVehicle = await prisma.vehicle.create({
    data: {
      truckerId: otherProfile.id,
      licensePlate: `AD-${seq}`,
      brand: "Test",
      model: "Benne",
      year: 2022,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 15,
    },
  })
  await prisma.creditWallet.create({ data: { userId: rich.id, purchasedBalance: 5, balance: 5 } })
  await prisma.creditWallet.create({ data: { userId: other.id, purchasedBalance: 5, balance: 5 } })
  const poorToken = generateToken(poor.id, poor.email, "TRUCKER")
  const richToken = generateToken(rich.id, rich.email, "TRUCKER")
  const otherToken = generateToken(other.id, other.email, "TRUCKER")
  const clientToken = generateToken(client.id, client.email, "CLIENT")

  const listed = await browse(call("/api/requests/browse", "GET", poorToken))
  const listedBody = await listed.json()
  const card = listedBody.data.requests.find((item: { id: string }) => item.id === request.id)
  assert.equal(listed.status, 200)
  assert.equal(JSON.stringify(card).includes(client.phone), false)
  assert.equal(card.customer.user.phone, "masqué")

  const quoteBody = {
    requestId: request.id,
    vehicleId: vehicle.id,
    totalPrice: 90000,
    proposedDate: when,
    validUntil: when,
  }
  const refused = await createQuote(call("/api/quotes", "POST", poorToken, { ...quoteBody, vehicleId: poorVehicle.id }))
  assert.equal(refused.status, 402)
  const created = await createQuote(call("/api/quotes", "POST", richToken, quoteBody))
  assert.equal(created.status, 201)
  const quoteId = (await created.json()).data.id as string
  const otherQuote = await createQuote(call("/api/quotes", "POST", otherToken, { ...quoteBody, vehicleId: otherVehicle.id }))
  assert.equal(otherQuote.status, 201)

  await prisma.contactUnlock.create({
    data: { requestId: request.id, unlockedByUserId: rich.id, unlockedContacts: [{ phone: client.phone, email: client.email }] },
  })
  const detail = await getRequest(call(`/api/requests/${request.id}`, "GET", richToken), { params: Promise.resolve({ id: request.id }) })
  const detailBody = await detail.json()
  assert.equal(JSON.stringify(detailBody).includes(client.phone), false)
  const quoteView = await getQuote(call(`/api/quotes/${quoteId}`, "GET", richToken), { params: Promise.resolve({ id: quoteId }) })
  assert.equal(JSON.stringify(await quoteView.json()).includes(client.phone), false)
  const direct = await unlockCustomer(call(`/api/requests/${request.id}/unlock-customer-contact`, "POST", richToken), { params: Promise.resolve({ id: request.id }) })
  assert.equal(direct.status, 403)
  const book = await contacts(call("/api/contacts", "GET", richToken))
  assert.equal(JSON.stringify(await book.json()).includes(client.phone), false)
  const profile = await customerProfile(call("/api/profile/customer", "GET", richToken))
  assert.equal(profile.status, 404)
  const users = await adminUsers(call("/api/admin/utilisateurs", "GET", richToken))
  assert.equal(users.status, 401)

  const accepted = await acceptQuote(call(`/api/quotes/${quoteId}/accept`, "POST", clientToken), { params: Promise.resolve({ id: quoteId }) })
  assert.equal(accepted.status, 201)
  const missionId = (await accepted.json()).data.id as string
  const mission = await getMission(call(`/api/missions/${missionId}`, "GET", richToken), { params: Promise.resolve({ id: missionId }) })
  const missionBody = await mission.json()
  assert.equal(missionBody.data.customer.user.phone, client.phone)
  const released = await unlockCustomer(call(`/api/requests/${request.id}/unlock-customer-contact`, "POST", richToken), { params: Promise.resolve({ id: request.id }) })
  assert.equal(released.status, 200)
  assert.equal((await released.json()).data.phone, client.phone)
  const after = await contacts(call("/api/contacts", "GET", richToken))
  assert.equal(JSON.stringify(await after.json()).includes(client.phone), true)

  const rejectedView = await getRequest(call(`/api/requests/${request.id}`, "GET", otherToken), { params: Promise.resolve({ id: request.id }) })
  assert.equal(JSON.stringify(await rejectedView.json()).includes(client.phone), false)
})

test("réinitialisation administrateur, sessions et conservation du mode sans envoi", async () => {
  const env = process.env as { ACCOUNT_RECOVERY_CHANNEL?: string; OTP_DEBUG_RETURN?: string }
  const previousChannel = env.ACCOUNT_RECOVERY_CHANNEL
  const previousDebug = env.OTP_DEBUG_RETURN
  env.ACCOUNT_RECOVERY_CHANNEL = "admin"
  env.OTP_DEBUG_RETURN = "true"
  const client = await createUser("CLIENT")
  const admin = await createUser("ADMIN")
  const stranger = await createUser("TRUCKER")
  const superAdmin = await createUser("SUPER_ADMIN")
  const otherSuper = await createUser("SUPER_ADMIN")
  const oldToken = generateToken(client.id, client.email, "CLIENT", 0)
  const adminToken = generateToken(admin.id, admin.email, "ADMIN", 0)
  const strangerToken = generateToken(stranger.id, stranger.email, "TRUCKER", 0)
  const superToken = generateToken(superAdmin.id, superAdmin.email, "SUPER_ADMIN", 0)

  const unknown = await forgotPassword(call("/api/auth/forgot-password", "POST", undefined, { identifier: "70000000" }))
  const known = await forgotPassword(call("/api/auth/forgot-password", "POST", undefined, { identifier: client.email }))
  const unknownBody = await unknown.json()
  const knownBody = await known.json()
  assert.equal(unknown.status, 200)
  assert.equal(known.status, 200)
  assert.equal(unknownBody.message, knownBody.message)
  assert.equal(unknownBody.debugOtp, undefined)
  assert.equal(knownBody.debugOtp, undefined)

  const strangerReset = await resetPassword(call("/api/admin/mots-de-passe", "POST", strangerToken, {
    identifier: client.phone,
    confirm: true,
    identityMethod: "IN_PERSON",
    identityNote: "Pièce présentée au bureau",
  }))
  assert.equal(strangerReset.status, 403)
  const forbidden = await resetPassword(call("/api/admin/mots-de-passe", "POST", adminToken, {
    identifier: superAdmin.phone,
    confirm: true,
    identityMethod: "IN_PERSON",
    identityNote: "Pièce présentée au bureau",
    confirmationPhrase: "REINITIALISER-SUPER-ADMIN",
  }))
  assert.equal(forbidden.status, 403)
  const doubt = await resetPassword(call("/api/admin/mots-de-passe", "POST", adminToken, {
    identifier: client.phone,
    confirm: true,
    identityDoubt: true,
    identityMethod: "IN_PERSON",
    identityNote: "La pièce ne correspond pas",
  }))
  assert.equal(doubt.status, 409)

  const reset = await resetPassword(call("/api/admin/mots-de-passe", "POST", adminToken, {
    identifier: client.email,
    confirm: true,
    identityMethod: "PHONE_CALLBACK",
    identityNote: "Rappel sur le numéro déjà connu",
  }))
  assert.equal(reset.status, 200)
  const resetBody = await reset.json()
  const temporaryPassword = resetBody.data.temporaryPassword as string
  const audits = await prisma.auditLog.findMany({ where: { resourceId: client.id, action: "password_reset_admin" } })
  assert.equal(JSON.stringify(audits).includes(temporaryPassword), false)
  const stillOpen = await customerProfile(call("/api/profile/customer", "GET", oldToken))
  assert.equal(stillOpen.status, 401)

  const limited = await login(call("/api/auth/login", "POST", undefined, { identifier: client.phone, password: temporaryPassword }))
  assert.equal(limited.status, 200)
  const limitedBody = await limited.json()
  assert.equal(limitedBody.data.passwordChangeRequired, true)
  const blocked = await customerProfile(call("/api/profile/customer", "GET", limitedBody.data.token))
  assert.equal(blocked.status, 401)
  const changed = await changePassword(call("/api/auth/change-password", "POST", limitedBody.data.token, { password: "suivant123" }))
  assert.equal(changed.status, 200)
  const changedBody = await changed.json()
  const opened = await customerProfile(call("/api/profile/customer", "GET", changedBody.data.token))
  assert.equal(opened.status, 200)
  const reused = await login(call("/api/auth/login", "POST", undefined, { identifier: client.phone, password: temporaryPassword }))
  assert.equal(reused.status, 401)
  const replaced = await login(call("/api/auth/login", "POST", undefined, { identifier: client.email, password: "suivant123" }))
  assert.equal(replaced.status, 200)

  const reinforced = await resetPassword(call("/api/admin/mots-de-passe", "POST", superToken, {
    identifier: otherSuper.email,
    confirm: true,
    identityMethod: "IDENTITY_DOCUMENT",
    identityNote: "Pièce comparée hors plateforme",
    confirmationPhrase: "REINITIALISER-SUPER-ADMIN",
  }))
  assert.equal(reinforced.status, 200)
  const mail = await sendAccountEmail({ to: client.email, subject: "test", text: "sans secret" })
  assert.deepEqual(mail, { delivered: false, simulated: false })
  const found = await findAccount(call(`/api/admin/mots-de-passe?identifier=${client.phone}`, "GET", adminToken))
  const foundBody = await found.json()
  assert.equal(found.status, 200)
  assert.equal(foundBody.data.role, "CLIENT")
  assert.equal(foundBody.data.password, undefined)
  if (previousChannel === undefined) delete env.ACCOUNT_RECOVERY_CHANNEL
  else env.ACCOUNT_RECOVERY_CHANNEL = previousChannel
  if (previousDebug === undefined) delete env.OTP_DEBUG_RETURN
  else env.OTP_DEBUG_RETURN = previousDebug
})
