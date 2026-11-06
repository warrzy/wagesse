import { expect, test, type Page, type TestInfo } from "@playwright/test"

const client = { phone: "72000001", password: "password123" }
const admin = { phone: "72200001", password: "password123" }

function collectDiagnostics(page: Page) {
  const diagnostics = { consoleErrors: [] as string[], failedRequests: [] as string[] }
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text())
  })
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText || "failed"
    if (reason === "net::ERR_ABORTED") return
    diagnostics.failedRequests.push(`${request.method()} ${request.url()} - ${reason}`)
  })
  page.on("response", (response) => {
    if (response.status() < 400) return
    const url = response.url()
    if (url.includes("/terms") || url.includes("/privacy")) return
    diagnostics.failedRequests.push(`${response.request().method()} ${url} - HTTP ${response.status()}`)
  })
  return diagnostics
}

async function attachDiagnostics(testInfo: TestInfo, diagnostics: { consoleErrors: string[]; failedRequests: string[] }) {
  await testInfo.attach("browser-diagnostics", {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: "application/json",
  })
}

async function login(page: Page, phone: string, password: string, destination: RegExp) {
  await page.goto("/auth/login")
  await page.getByRole("textbox", { name: /téléphone/i }).fill(phone)
  await page.getByLabel(/mot de passe/i).fill(password)
  await page.getByRole("button", { name: /^se connecter$/i }).click()
  await expect(page).toHaveURL(destination)
}

test("la récupération de mot de passe répond sans révéler le compte", async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page)
  await page.goto("/auth/forgot")
  await page.getByLabel(/téléphone/i).fill("60000000")
  await page.getByRole("button", { name: /recevoir le code/i }).click()
  await expect(page.getByText("Si ce numéro a un compte, un code a été envoyé.")).toBeVisible()
  await expect(page.getByLabel("Code")).toBeVisible()
  await attachDiagnostics(testInfo, diagnostics)
  expect(diagnostics.consoleErrors).toEqual([])
  expect(diagnostics.failedRequests).toEqual([])
})

test("le client enregistre son profil", async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page)
  await login(page, client.phone, client.password, /\/dashboard\/client/)
  await page.goto("/dashboard/client/profil")
  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible()
  await page.getByLabel("Ville").fill("Ouagadougou")
  await page.getByLabel("Secteur").fill("BTP")
  await page.getByRole("button", { name: "Enregistrer" }).click()
  await expect(page.getByText("Profil enregistré")).toBeVisible()
  await attachDiagnostics(testInfo, diagnostics)
  expect(diagnostics.consoleErrors).toEqual([])
  expect(diagnostics.failedRequests).toEqual([])
})

test("l'administrateur consulte le journal, les notifications et les paramètres", async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page)
  await login(page, admin.phone, admin.password, /\/admin/)
  await page.goto("/admin/logs")
  await expect(page.getByRole("heading", { name: "Journal d’audit" })).toBeVisible()
  await expect(page.getByText(/Aucune opération enregistrée|Modifications de compte/)).toBeVisible()
  await page.goto("/admin/notifications")
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible()
  await page.goto("/admin/parametres")
  await expect(page.getByRole("heading", { name: "Paramètres" })).toBeVisible()
  await expect(page.getByText("Mode de paiement :")).toBeVisible()
  await expect(page.getByText("MANUAL")).toBeVisible()
  await expect(page.getByText("PayDunya activé :")).toBeVisible()
  await expect(page.getByText("non", { exact: true })).toBeVisible()
  await page.goto("/admin/administrateurs")
  await expect(page.getByRole("heading", { name: "Administrateurs" })).toBeVisible()
  await expect(page.getByText("72200001 · ACTIVE")).toBeVisible()
  await attachDiagnostics(testInfo, diagnostics)
  expect(diagnostics.consoleErrors).toEqual([])
  expect(diagnostics.failedRequests).toEqual([])
})

test("le menu admin s'ouvre sur un écran étroit", async ({ page }, testInfo) => {
  const diagnostics = collectDiagnostics(page)
  await login(page, admin.phone, admin.password, /\/admin/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/admin/logs")
  await page.getByRole("button", { name: "Menu", exact: true }).click()
  await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible()
  await page.getByRole("link", { name: "Journal d’audit" }).click()
  await expect(page).toHaveURL(/\/admin\/logs/)
  await attachDiagnostics(testInfo, diagnostics)
  expect(diagnostics.consoleErrors).toEqual([])
  expect(diagnostics.failedRequests).toEqual([])
})
