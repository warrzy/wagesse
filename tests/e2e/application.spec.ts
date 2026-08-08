import { expect, test, type Page, type TestInfo } from "@playwright/test"

const users = {
  client: { phone: "72000001", password: "password123", destination: /\/dashboard\/client/ },
  trucker: { phone: "72100001", password: "password123", destination: /\/dashboard\/trucker/ },
  admin: { phone: "72200001", password: "password123", destination: /\/admin/ },
} as const

type Diagnostics = { consoleErrors: string[]; failedRequests: string[] }

function collectDiagnostics(page: Page): Diagnostics {
  const diagnostics: Diagnostics = { consoleErrors: [], failedRequests: [] }

  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text())
  })
  page.on("requestfailed", (request) => {
    diagnostics.failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText || "failed"}`)
  })
  page.on("response", (response) => {
    if (response.status() >= 400) {
      diagnostics.failedRequests.push(`${response.request().method()} ${response.url()} - HTTP ${response.status()}`)
    }
  })

  return diagnostics
}

async function attachDiagnostics(testInfo: TestInfo, diagnostics: Diagnostics) {
  await testInfo.attach("browser-diagnostics", {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: "application/json",
  })
}

async function login(page: Page, user: (typeof users)[keyof typeof users]) {
  await page.goto("/auth/login")
  await page.getByRole("textbox", { name: /téléphone/i }).fill(user.phone)
  await page.getByLabel(/mot de passe/i).fill(user.password)
  await page.getByRole("button", { name: /^se connecter$/i }).click()
  await expect(page).toHaveURL(user.destination)
}

test.describe("public", () => {
  test("la page d'accueil charge", async ({ page }, testInfo) => {
    const diagnostics = collectDiagnostics(page)
    const response = await page.goto("/")
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator("body")).toBeVisible()
    await expect(page.getByRole("heading").first()).toBeVisible()
    await attachDiagnostics(testInfo, diagnostics)
    expect(diagnostics.consoleErrors).toEqual([])
    expect(diagnostics.failedRequests).toEqual([])
  })

  test("la navigation principale vers les tarifs fonctionne", async ({ page }, testInfo) => {
    const diagnostics = collectDiagnostics(page)
    await page.goto("/")
    await page.getByRole("link", { name: /tarifs/i }).first().click()
    await expect(page).toHaveURL(/\/pricing/)
    await expect(page.locator("main")).toBeVisible()
    await attachDiagnostics(testInfo, diagnostics)
    expect(diagnostics.consoleErrors).toEqual([])
    expect(diagnostics.failedRequests).toEqual([])
  })
})

for (const [role, user] of Object.entries(users)) {
  test(`connexion ${role}`, async ({ page }, testInfo) => {
    const diagnostics = collectDiagnostics(page)
    await login(page, user)
    await expect(page.locator("body")).toBeVisible()
    await attachDiagnostics(testInfo, diagnostics)
    expect(diagnostics.consoleErrors).toEqual([])
    expect(diagnostics.failedRequests).toEqual([])
  })
}

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => login(page, users.admin))

  test("un administrateur arrive sur /admin", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.locator("main")).toBeVisible()
  })

  for (const route of ["annonces", "paiements", "transports"]) {
    test(`/admin/${route} charge`, async ({ page }, testInfo) => {
      const diagnostics = collectDiagnostics(page)
      const response = await page.goto(`/admin/${route}`)
      expect(response?.ok()).toBeTruthy()
      await expect(page.locator("main")).toBeVisible()
      await attachDiagnostics(testInfo, diagnostics)
      expect(diagnostics.consoleErrors).toEqual([])
      expect(diagnostics.failedRequests).toEqual([])
    })
  }
})

test("un client ne peut pas accéder à /admin", async ({ page }) => {
  await login(page, users.client)
  await page.goto("/admin")
  await expect(page).not.toHaveURL(/\/admin(?:\/|$)/)
  await expect(page).toHaveURL(/\/dashboard\/client/)
})
