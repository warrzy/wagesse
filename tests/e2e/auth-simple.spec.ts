import { expect, test } from "@playwright/test"

const password = "Simple123"

test("l'inscription ouvre le tableau de bord sans écran SMS", async ({ page }) => {
  const phone = `75${String(Date.now()).slice(-6)}`
  await page.goto("/auth/signup")
  await page.locator('input[name="phone"]').fill(phone)
  await page.locator('input[name="firstName"]').fill("E2E")
  await page.locator('input[name="lastName"]').fill("Simple")
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  await page.getByRole("button", { name: "S'inscrire" }).click()
  await expect(page).toHaveURL(/\/dashboard\/client/)
  await expect(page).not.toHaveURL(/\/auth\/verify/)
})

test("le serveur refuse un contournement du drapeau et applique le mode configuré", async ({ request }) => {
  const policy = await request.get("/api/auth/phone-verification")
  expect(policy.ok()).toBeTruthy()
  const body = await policy.json()
  expect(body.data).not.toHaveProperty("SMS_HTTP_KEY")
  const override = await request.post("/api/auth/phone-verification", { data: { required: false } })
  expect(override.status()).toBe(405)
})
