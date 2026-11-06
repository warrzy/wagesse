import { createHash, timingSafeEqual } from "crypto"
import type { PaymentRequest, PaymentResponse } from "@/lib/payment-provider"

export type PaydunyaEnv = {
  masterKey?: string
  privateKey?: string
  token?: string
  mode?: string
  storeName?: string
}

export function readPaydunyaEnv(env: NodeJS.ProcessEnv = process.env): PaydunyaEnv {
  return {
    masterKey: env.PAYDUNYA_MASTER_KEY?.trim() || "",
    privateKey: env.PAYDUNYA_PRIVATE_KEY?.trim() || "",
    token: env.PAYDUNYA_TOKEN?.trim() || "",
    mode: (env.PAYDUNYA_MODE || "test").trim().toLowerCase(),
    storeName: env.PAYDUNYA_STORE_NAME?.trim() || "WAGESSE",
  }
}

export function paydunyaConfigured(config: PaydunyaEnv): boolean {
  return Boolean(config.masterKey && config.privateKey && config.token)
}

export function paydunyaBaseUrl(config: PaydunyaEnv): string {
  return config.mode === "live"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1"
}

export function paydunyaMasterKeyHash(masterKey: string): string {
  return createHash("sha512").update(masterKey).digest("hex")
}

export function paydunyaHashMatches(masterKey: string, hash: string | undefined | null): boolean {
  if (!masterKey || !hash) return false
  const expected = Buffer.from(paydunyaMasterKeyHash(masterKey), "utf8")
  const received = Buffer.from(hash.trim(), "utf8")
  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}

export function paydunyaConfirmationGrants(input: {
  masterKey: string
  hash?: string | null
  status?: string | null
  amount?: number | null
  expectedAmount: number
}): boolean {
  if (!paydunyaHashMatches(input.masterKey, input.hash)) return false
  if ((input.status || "").toLowerCase() !== "completed") return false
  if (input.amount === undefined || input.amount === null || Number.isNaN(Number(input.amount))) return false
  return Number(input.amount) === Number(input.expectedAmount)
}

export type PaydunyaParsedNotice = {
  hash?: string
  status?: string
  token?: string
  amount?: number
}

export function parsePaydunyaNotice(input: Record<string, unknown>): PaydunyaParsedNotice {
  const nested = input.data
  if (nested && typeof nested === "object") {
    const data = nested as Record<string, unknown>
    const invoice = (data.invoice && typeof data.invoice === "object" ? data.invoice : {}) as Record<string, unknown>
    const amountRaw = invoice.total_amount ?? data.total_amount
    return {
      hash: typeof data.hash === "string" ? data.hash : undefined,
      status: typeof data.status === "string" ? data.status : undefined,
      token: typeof invoice.token === "string" ? invoice.token : typeof data.token === "string" ? data.token : undefined,
      amount: amountRaw === undefined ? undefined : Number(amountRaw),
    }
  }

  const read = (key: string) => {
    const value = input[key]
    return typeof value === "string" ? value : undefined
  }
  const amountRaw = read("data[invoice][total_amount]")
  return {
    hash: read("data[hash]"),
    status: read("data[status]"),
    token: read("data[invoice][token]") || read("data[token]"),
    amount: amountRaw === undefined ? undefined : Number(amountRaw),
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export class PayDunyaProvider {
  private fetchImpl: FetchLike
  private env: NodeJS.ProcessEnv

  constructor(fetchImpl: FetchLike = fetch, env: NodeJS.ProcessEnv = process.env) {
    this.fetchImpl = fetchImpl
    this.env = env
  }

  private config() {
    return readPaydunyaEnv(this.env)
  }

  private headers(config: PaydunyaEnv): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      "PAYDUNYA-MASTER-KEY": config.masterKey || "",
      "PAYDUNYA-PRIVATE-KEY": config.privateKey || "",
      "PAYDUNYA-TOKEN": config.token || "",
    }
  }

  async charge(request: PaymentRequest): Promise<PaymentResponse> {
    const config = this.config()
    if (this.env.NODE_ENV === "production" && this.env.PAYDUNYA_ENABLED !== "true") {
      return { success: false, status: "failed", errorMessage: "PayDunya n'est pas activé en production" }
    }
    if (!paydunyaConfigured(config)) {
      return { success: false, status: "failed", errorMessage: "Configuration PayDunya incomplète" }
    }

    try {
      const res = await this.fetchImpl(`${paydunyaBaseUrl(config)}/checkout-invoice/create`, {
        method: "POST",
        headers: this.headers(config),
        body: JSON.stringify({
          invoice: {
            total_amount: request.amount,
            description: request.description || `Paiement ${request.reference}`,
          },
          store: { name: config.storeName },
          custom_data: { payment_reference: request.reference },
          actions: {
            cancel_url: request.callbackUrl,
            return_url: request.callbackUrl,
            callback_url: this.env.PAYDUNYA_CALLBACK_URL || request.callbackUrl,
          },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        response_code?: string
        response_text?: string
        token?: string
      }
      if (!res.ok || data.response_code !== "00" || !data.token) {
        return {
          success: false,
          status: "failed",
          errorMessage: "Création de facture PayDunya refusée",
        }
      }
      return {
        success: true,
        transactionId: data.token,
        providerReference: data.token,
        status: "initiated",
        redirectUrl: data.response_text,
        raw: { provider: "paydunya" },
      }
    } catch {
      return { success: false, status: "failed", errorMessage: "PayDunya indisponible" }
    }
  }

  async verify(token: string, expectedAmount: number): Promise<PaymentResponse> {
    const config = this.config()
    if (!paydunyaConfigured(config)) {
      return { success: false, status: "failed", errorMessage: "Configuration PayDunya incomplète" }
    }

    try {
      const res = await this.fetchImpl(`${paydunyaBaseUrl(config)}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
        method: "GET",
        headers: this.headers(config),
      })
      const data = (await res.json().catch(() => ({}))) as {
        hash?: string
        status?: string
        invoice?: { total_amount?: number | string }
      }
      const amount = data.invoice?.total_amount === undefined ? null : Number(data.invoice.total_amount)
      const grants = paydunyaConfirmationGrants({
        masterKey: config.masterKey || "",
        hash: data.hash,
        status: data.status,
        amount,
        expectedAmount,
      })
      if (grants) {
        return { success: true, transactionId: token, providerReference: token, status: "success" }
      }
      const normalized = (data.status || "").toLowerCase()
      if (normalized === "cancelled" || normalized === "canceled" || normalized === "failed") {
        return { success: false, transactionId: token, status: "failed", errorMessage: "Paiement PayDunya non abouti" }
      }
      return { success: false, transactionId: token, status: "pending" }
    } catch {
      return { success: false, status: "failed", errorMessage: "Vérification PayDunya impossible" }
    }
  }
}
