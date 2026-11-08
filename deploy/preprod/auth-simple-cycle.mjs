import http from "node:http"
import { randomBytes, randomInt } from "node:crypto"
import { readFileSync } from "node:fs"

const registry = JSON.parse(readFileSync(process.argv[2], "utf8"))
const adminAccount = registry.accounts.find((account) => account.phone === "78003021")
if (!adminAccount?.password) {
  console.log("FAIL admin-recette compte absent")
  process.exit(1)
}

const base = "http://127.0.0.1:3020"
const password = `Aa1${randomBytes(12).toString("base64url")}`
const phones = {
  client: `781${String(randomInt(0, 100000)).padStart(5, "0")}`,
  trucker: `781${String(randomInt(0, 100000)).padStart(5, "0")}`,
  other: `781${String(randomInt(0, 100000)).padStart(5, "0")}`,
  locked: `781${String(randomInt(0, 100000)).padStart(5, "0")}`,
}

function fail(name, detail) {
  console.log(`FAIL ${name} ${detail}`.slice(0, 180))
  process.exit(1)
}

function pass(name, detail = "") {
  console.log(`PASS ${name}${detail ? " " + detail : ""}`.slice(0, 180))
}

async function call(method, path, { token, body, host } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(host ? { host } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: response.status, json, text }
}

function errorOf(result) {
  return String(result.json?.error || result.json?.code || "").slice(0, 80)
}

async function expect(name, result, status) {
  if (result.status !== status) fail(name, `HTTP ${result.status} ${errorOf(result)}`)
  pass(name, `HTTP ${status}`)
  return result
}

function requestWithHost(host) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 3020,
        path: "/api/admin/recette/verify-phone",
        method: "POST",
        headers: { host, "content-type": "application/json", "content-length": 2 },
      },
      (res) => {
        res.resume()
        res.on("end", () => resolve(res.statusCode || 0))
      }
    )
    req.on("error", reject)
    req.end("{}")
  })
}

async function signup(phone, role, lastName) {
  const result = await call("POST", "/api/auth/signup", {
    body: { phone, password, firstName: "Recette", lastName, role },
  })
  if (result.status !== 201 || !result.json?.data?.token) {
    fail(`inscription ${role}`, `HTTP ${result.status} ${errorOf(result)}`)
  }
  if (result.json.data.phoneVerificationRequired !== false) fail(`inscription ${role}`, "SMS exigé")
  if (result.json.data.user.phoneVerified !== null) fail(`inscription ${role}`, "téléphone marqué vérifié")
  if (result.json.data.debugOtp) fail(`inscription ${role}`, "code exposé")
  if (result.text.includes("/auth/verify")) fail(`inscription ${role}`, "parcours OTP")
  pass(`inscription ${role}`, "sans SMS")
  console.log(`PHONE ${role} ${phone}`)
  return { token: result.json.data.token, id: result.json.data.user.id, role: result.json.data.user.role }
}

const policy = await expect("politique publique", await call("GET", "/api/auth/phone-verification"), 200)
if (policy.json?.data?.required !== false || policy.json?.data?.misconfigured !== false) {
  fail("politique publique", "mode simple absent")
}
await expect("écriture politique", await call("POST", "/api/auth/phone-verification", { body: { required: true } }), 405)
const outside = await requestWithHost("wagesse.fr")
if (outside !== 404) fail("vérification fictive hors périmètre", `HTTP ${outside}`)
pass("vérification fictive hors périmètre", "HTTP 404")

const client = await signup(phones.client, "CLIENT", "ClienteSimple")
const trucker = await signup(phones.trucker, "TRUCKER", "TransporteurSimple")
const other = await signup(phones.other, "CLIENT", "ClienteAutre")
const locked = await signup(phones.locked, "CLIENT", "ClienteVerrou")

const clientLogin = await expect(
  "connexion client",
  await call("POST", "/api/auth/login", { body: { phone: phones.client, password } }),
  200
)
if (clientLogin.json.data.user.role !== "CLIENT" || clientLogin.json.data.user.phoneVerified !== null) {
  fail("connexion client", "rôle ou téléphone inattendu")
}
const truckerLogin = await expect(
  "connexion transporteur",
  await call("POST", "/api/auth/login", { body: { phone: phones.trucker, password } }),
  200
)
if (truckerLogin.json.data.user.role !== "TRUCKER") fail("connexion transporteur", "rôle inattendu")
await expect(
  "mot de passe incorrect",
  await call("POST", "/api/auth/login", { body: { phone: phones.client, password: "Mauvais123" } }),
  401
)
for (let attempt = 1; attempt <= 5; attempt += 1) {
  await expect(
    `tentative ${attempt}`,
    await call("POST", "/api/auth/login", { body: { phone: phones.locked, password: "Mauvais123" } }),
    401
  )
}
await expect(
  "limitation des tentatives",
  await call("POST", "/api/auth/login", { body: { phone: phones.locked, password } }),
  429
)
await expect("session", await call("GET", "/api/auth/me", { token: client.token }), 200)
await expect("session sans jeton", await call("GET", "/api/auth/me"), 401)

const adminLogin = await call("POST", "/api/auth/login", {
  body: { phone: "78003021", password: adminAccount.password },
})
if (adminLogin.status !== 200 || adminLogin.json?.data?.user?.role !== "ADMIN") {
  fail("connexion admin recette", `HTTP ${adminLogin.status}`)
}
const admin = { token: adminLogin.json.data.token }
pass("connexion admin recette")
await expect("admin sans jeton", await call("GET", "/api/admin/dashboard"), 401)
await expect("admin par client", await call("GET", "/api/admin/dashboard", { token: client.token }), 401)
await expect("admin par transporteur", await call("GET", "/api/admin/utilisateurs", { token: trucker.token }), 401)
const logs = await call("GET", "/api/admin/logs", { token: admin.token })
if (logs.status !== 200) fail("journal d'audit", `HTTP ${logs.status}`)
const audited = Array.isArray(logs.json?.data?.items) && logs.json.data.items.some((item) => item.action === "login_locked")
if (!audited) fail("journal d'audit", "verrouillage absent")
pass("journal d'audit")

const when = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const request = await expect(
  "publication demande",
  await call("POST", "/api/requests", {
    token: client.token,
    body: {
      material: "Sable de mode simple",
      quantity: 8,
      unit: "TONNES",
      pickupCity: "Ouagadougou",
      dropoffCity: "Koudougou",
      requestedDate: when,
    },
  }),
  201
)
const requestId = request.json.data.id
await expect("mise en ligne", await call("POST", `/api/requests/${requestId}/publish`, { token: client.token }), 200)
await expect("demande isolée", await call("GET", `/api/requests/${requestId}`, { token: other.token }), 403)

const plate = `AA-${randomInt(1000, 9999)}-MD`
const vehicle = await expect(
  "véhicule",
  await call("POST", "/api/vehicles", {
    token: trucker.token,
    body: {
      licensePlate: plate,
      brand: "Recette",
      model: "ModeSimple",
      year: 2020,
      vehicleType: "DUMP_TRUCK_3_AXLES",
      capacityTonnes: 15,
    },
  }),
  201
)
const vehicleId = vehicle.json.data.id
const hiddenVehicles = await expect("véhicules isolés", await call("GET", "/api/vehicles", { token: other.token }), 404)
if (hiddenVehicles.text.includes(plate)) fail("véhicules isolés", "plaque visible")
const ownVehicles = await call("GET", "/api/vehicles", { token: trucker.token })
if (!ownVehicles.text.includes(plate)) fail("véhicule", "plaque absente du propriétaire")
pass("véhicule du propriétaire")

const beforeUnlock = await call("GET", `/api/requests/${requestId}`, { token: trucker.token })
if (beforeUnlock.status !== 200) fail("consultation demande", `HTTP ${beforeUnlock.status}`)
if (beforeUnlock.text.includes(phones.client)) fail("coordonnées masquées", "numéro client visible")
pass("coordonnées masquées")

const quote = await expect(
  "devis",
  await call("POST", "/api/quotes", {
    token: trucker.token,
    body: { requestId, vehicleId, totalPrice: 120000, proposedDate: when, validUntil: when },
  }),
  201
)
const quoteId = quote.json.data.id
const lockedView = await call("GET", `/api/requests/${requestId}`, { token: client.token })
if (lockedView.text.includes(phones.trucker)) fail("devis verrouillé", "numéro transporteur visible")
pass("devis verrouillé")

await expect("achat sans session", await call("POST", "/api/credits/purchase", { body: { packCode: "absent" } }), 401)
const packs = await expect("catalogue crédits", await call("GET", "/api/credits/packs"), 200)
const pack = packs.json.data[0]
if (!pack?.code) fail("catalogue crédits", "aucun pack")
const plans = await call("GET", "/api/subscription/plans")
if (plans.status === 200 && plans.json?.data?.length) {
  const planCode = plans.json.data.find((item) => item.code)?.code
  if (!planCode) {
    console.log("BLOCKED forfait code absent")
  } else {
    const order = await expect(
      "commande forfait",
      await call("POST", "/api/subscription/purchase", { token: client.token, body: { planCode } }),
      201
    )
    await expect(
      "refus forfait",
      await call("POST", `/api/admin/commandes/${order.json.data.order.id}/reject`, {
        token: admin.token,
        body: { note: "Refus fictif du mode simple" },
      }),
      200
    )
  }
} else {
  console.log("BLOCKED forfait aucun plan publié")
}

async function balance(token) {
  const result = await call("GET", "/api/credits/balance", { token })
  if (result.status !== 200) fail("solde", `HTTP ${result.status}`)
  return result.json.data.balance
}

const otherRequest = await call("POST", "/api/requests", {
  token: other.token,
  body: {
    material: "Gravier isolé",
    quantity: 2,
    unit: "TONNES",
    pickupCity: "Ouagadougou",
    dropoffCity: "Ouahigouya",
    requestedDate: when,
  },
})
if (otherRequest.status !== 201) fail("demande sans crédit", `HTTP ${otherRequest.status}`)
await expect(
  "déblocage sans crédit",
  await call("POST", `/api/requests/${otherRequest.json.data.id}/unlock-contacts`, { token: other.token }),
  402
)

const before = await balance(client.token)
const purchase = await expect(
  "demande de paiement",
  await call("POST", "/api/credits/purchase", { token: client.token, body: { packCode: pack.code } }),
  201
)
const orderId = purchase.json.data.order.id
if ((await balance(client.token)) !== before) fail("solde avant validation", "le solde a changé")
pass("solde avant validation")
const approved = await expect(
  "validation paiement",
  await call("POST", `/api/admin/commandes/${orderId}/approve`, {
    token: admin.token,
    body: { note: "Validation fictive du mode simple" },
  }),
  200
)
if (approved.json.data.alreadyProcessed) fail("validation paiement", "déjà traité")
const granted = await balance(client.token)
if (granted !== before + pack.credits) fail("attribution", "montant inattendu")
pass("attribution unique")
const again = await call("POST", `/api/admin/commandes/${orderId}/approve`, { token: admin.token, body: {} })
if (again.status !== 200 || again.json?.data?.alreadyProcessed !== true) fail("double validation", `HTTP ${again.status}`)
if ((await balance(client.token)) !== granted) fail("double validation", "le solde a augmenté")
pass("double validation")

await expect("acceptation sans déblocage", await call("POST", `/api/quotes/${quoteId}/accept`, { token: client.token }), 402)
await expect("déblocage", await call("POST", `/api/requests/${requestId}/unlock-contacts`, { token: client.token }), 200)
const afterUnlock = await balance(client.token)
if (afterUnlock >= granted) fail("déblocage", "aucun crédit consommé")
const repeat = await call("POST", `/api/requests/${requestId}/unlock-contacts`, { token: client.token })
if (repeat.status !== 200 || repeat.json?.data?.alreadyUnlocked !== true) fail("second déblocage", `HTTP ${repeat.status}`)
if ((await balance(client.token)) !== afterUnlock) fail("second déblocage", "crédit consommé deux fois")
pass("déblocage unique")
const opened = await call("GET", `/api/requests/${requestId}`, { token: client.token })
if (!opened.text.includes(phones.trucker)) fail("coordonnées débloquées", "numéro transporteur absent")
pass("coordonnées débloquées")

const mission = await expect(
  "acceptation devis",
  await call("POST", `/api/quotes/${quoteId}/accept`, { token: client.token }),
  201
)
const missionId = mission.json.data.id
for (const status of [
  "TRUCK_EN_ROUTE_PICKUP",
  "ARRIVED_PICKUP",
  "LOADING_IN_PROGRESS",
  "EN_ROUTE_DELIVERY",
  "ARRIVED_DELIVERY",
  "DELIVERED",
  "PENDING_CONFIRMATION",
]) {
  await expect(
    `mission ${status}`,
    await call("PATCH", `/api/missions/${missionId}/status`, { token: trucker.token, body: { status } }),
    200
  )
}
await expect(
  "clôture client",
  await call("PATCH", `/api/missions/${missionId}/status`, { token: client.token, body: { status: "COMPLETED" } }),
  200
)
console.log(`MISSION ${missionId}`)
pass("cycle mode simple")
