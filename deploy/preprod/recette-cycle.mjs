const registry = JSON.parse(await import("node:fs").then((fs) => fs.readFileSync(process.argv[2], "utf8")))
const accounts = Object.fromEntries(registry.accounts.map((account) => [account.phone, account]))
const base = "http://127.0.0.1:3020"
const labels = {
  "78001021": "client-a",
  "78001022": "client-b",
  "78002021": "trucker-a",
  "78002022": "trucker-b",
  "78003021": "admin-recette",
}

function fail(name, detail) {
  console.log(`FAIL ${name} ${detail}`.slice(0, 240))
  process.exit(1)
}

function pass(name, detail = "") {
  console.log(`PASS ${name}${detail ? " " + detail : ""}`.slice(0, 240))
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
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
  return { status: response.status, json }
}

function errorOf(result) {
  return String(result.json?.error || result.json?.message || "").slice(0, 140)
}

async function expect(name, result, status) {
  if (result.status !== status) fail(name, `HTTP ${result.status} ${errorOf(result)}`)
  pass(name, `HTTP ${status}`)
  return result
}

async function login(phone) {
  const result = await call("POST", "/api/auth/login", {
    body: { phone, password: accounts[phone].password },
  })
  if (result.status !== 200 || !result.json?.data?.token) {
    fail(`login ${labels[phone]}`, `HTTP ${result.status} ${errorOf(result)}`)
  }
  pass(`login ${labels[phone]}`, `role=${result.json.data.user.role}`)
  return { token: result.json.data.token, id: result.json.data.user.id, role: result.json.data.user.role }
}

const clientA = await login("78001021")
const clientB = await login("78001022")
const truckerA = await login("78002021")
const truckerB = await login("78002022")
const admin = await login("78003021")
if (admin.role !== "ADMIN") fail("admin-recette", "rôle inattendu")

await expect("admin sans jeton", await call("GET", "/api/admin/dashboard"), 401)
await expect("admin par client", await call("GET", "/api/admin/dashboard", { token: clientA.token }), 401)
await expect("admin par transporteur", await call("GET", "/api/admin/utilisateurs", { token: truckerA.token }), 401)
await expect("tableau admin", await call("GET", "/api/admin/dashboard", { token: admin.token }), 200)
await expect("utilisateurs admin", await call("GET", "/api/admin/utilisateurs", { token: admin.token }), 200)
await expect("commandes admin", await call("GET", "/api/admin/commandes", { token: admin.token }), 200)
await expect("forfaits admin", await call("GET", "/api/admin/subscription-plans", { token: admin.token }), 200)
await expect("journaux admin", await call("GET", "/api/admin/logs", { token: admin.token }), 200)
await expect(
  "vérification par un client",
  await call("POST", "/api/admin/recette/verify-phone", { token: clientA.token, body: { userId: clientA.id } }),
  401
)

await expect(
  "vérification fictive client-a",
  await call("POST", "/api/admin/recette/verify-phone", { token: admin.token, body: { userId: clientA.id } }),
  200
)
await expect(
  "vérification répétée",
  await call("POST", "/api/admin/recette/verify-phone", { token: admin.token, body: { userId: clientA.id } }),
  200
)

const packs = await expect("catalogue crédits", await call("GET", "/api/credits/packs"), 200)
const pack = packs.json.data[0]
const policy = await call("GET", "/api/auth/phone-verification")
const smsRequired = policy.json?.data?.required === true
if (smsRequired) {
  const blocked = await call("POST", "/api/credits/purchase", { token: clientB.token, body: { packCode: pack.code } })
  await expect("achat sans téléphone vérifié", blocked, 403)
  await expect(
    "vérification fictive client-b",
    await call("POST", "/api/admin/recette/verify-phone", { token: admin.token, body: { userId: clientB.id } }),
    200
  )
} else {
  const open = await call("POST", "/api/credits/purchase", { token: clientB.token, body: { packCode: pack.code } })
  await expect("achat autorisé sans SMS", open, 201)
}

async function balance(token) {
  const result = await call("GET", "/api/credits/balance", { token })
  if (result.status !== 200) fail("solde", `HTTP ${result.status}`)
  return result.json.data.balance
}

const before = await balance(clientA.token)
const purchase = await expect(
  "demande de paiement",
  await call("POST", "/api/credits/purchase", { token: clientA.token, body: { packCode: pack.code } }),
  201
)
const orderId = purchase.json.data.order.id
if ((await balance(clientA.token)) !== before) fail("solde avant validation", "le solde a changé")
pass("solde avant validation", String(before))

const approved = await expect(
  "validation paiement",
  await call("POST", `/api/admin/commandes/${orderId}/approve`, { token: admin.token, body: { note: "Recette fictive" } }),
  200
)
if (approved.json.data.alreadyProcessed) fail("validation paiement", "déjà traité")
const granted = await balance(clientA.token)
if (granted !== before + pack.credits) fail("attribution", `${before} + ${pack.credits} != ${granted}`)
pass("attribution unique", String(granted))

const again = await call("POST", `/api/admin/commandes/${orderId}/approve`, { token: admin.token, body: {} })
if (again.status !== 200 || again.json.data.alreadyProcessed !== true) {
  fail("double validation", `HTTP ${again.status}`)
}
if ((await balance(clientA.token)) !== granted) fail("double validation", "le solde a augmenté")
pass("double validation", "alreadyProcessed")

const second = await expect(
  "seconde demande",
  await call("POST", "/api/credits/purchase", { token: clientA.token, body: { packCode: pack.code } }),
  201
)
await expect(
  "refus paiement",
  await call("POST", `/api/admin/commandes/${second.json.data.order.id}/reject`, {
    token: admin.token,
    body: { note: "Refus de recette" },
  }),
  200
)
if ((await balance(clientA.token)) !== granted) fail("refus paiement", "le solde a changé")
pass("refus sans crédit")

const when = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
const request = await expect(
  "publication demande",
  await call("POST", "/api/requests", {
    token: clientA.token,
    body: {
      material: "Sable de recette finale",
      quantity: 12,
      unit: "TONNES",
      pickupCity: "Ouagadougou",
      dropoffCity: "Koudougou",
      requestedDate: when,
    },
  }),
  201
)
const requestId = request.json.data.id
await expect("mise en ligne", await call("POST", `/api/requests/${requestId}/publish`, { token: clientA.token }), 200)
await expect(
  "demande d'un autre client",
  await call("GET", `/api/requests/${requestId}`, { token: clientB.token }),
  403
)

const vehicles = await expect("véhicules", await call("GET", "/api/vehicles", { token: truckerA.token }), 200)
const vehicleId = vehicles.json.data[0]?.id
if (!vehicleId) fail("véhicules", "aucun véhicule")
const quote = await expect(
  "devis",
  await call("POST", "/api/quotes", {
    token: truckerA.token,
    body: {
      requestId,
      vehicleId,
      totalPrice: 150000,
      proposedDate: when,
      validUntil: when,
      comments: "Devis fictif de recette",
    },
  }),
  201
)
const quoteId = quote.json.data.id
await expect(
  "acceptation sans déblocage",
  await call("POST", `/api/quotes/${quoteId}/accept`, { token: clientA.token }),
  402
)
const unlocked = await expect(
  "déblocage",
  await call("POST", `/api/requests/${requestId}/unlock-contacts`, { token: clientA.token }),
  200
)
const afterUnlock = await balance(clientA.token)
if (afterUnlock >= granted) fail("déblocage", "aucun crédit consommé")
const repeat = await call("POST", `/api/requests/${requestId}/unlock-contacts`, { token: clientA.token })
if (repeat.status !== 200 || repeat.json.data.alreadyUnlocked !== true) fail("second déblocage", `HTTP ${repeat.status}`)
if ((await balance(clientA.token)) !== afterUnlock) fail("second déblocage", "crédit consommé deux fois")
pass("déblocage unique", String(afterUnlock))

const mission = await expect(
  "acceptation devis",
  await call("POST", `/api/quotes/${quoteId}/accept`, { token: clientA.token }),
  201
)
const missionId = mission.json.data.id
const truckerSteps = [
  "TRUCK_EN_ROUTE_PICKUP",
  "ARRIVED_PICKUP",
  "LOADING_IN_PROGRESS",
  "EN_ROUTE_DELIVERY",
  "ARRIVED_DELIVERY",
  "DELIVERED",
  "PENDING_CONFIRMATION",
]
for (const status of truckerSteps) {
  await expect(
    `mission ${status}`,
    await call("PATCH", `/api/missions/${missionId}/status`, { token: truckerA.token, body: { status } }),
    200
  )
}
await expect(
  "clôture client",
  await call("PATCH", `/api/missions/${missionId}/status`, { token: clientA.token, body: { status: "COMPLETED" } }),
  200
)
await expect(
  "clôture par le transporteur",
  await call("PATCH", `/api/missions/${missionId}/status`, { token: truckerA.token, body: { status: "COMPLETED" } }),
  400
)
console.log(`MISSION ${missionId}`)
pass("cycle terminé", labels["78002022"] ? "trucker-b connecté" : "")
if (!truckerB.token) fail("trucker-b", "session absente")
