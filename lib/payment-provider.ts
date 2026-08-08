/**
 * Payment Provider Abstraction
 *
 * Allows flexible switching between different payment providers.
 * Supports production and sandbox modes.
 */

export interface PaymentRequest {
  amount: number
  reference: string
  currency: string
  description?: string
  customerPhone?: string
  customerEmail?: string
  callbackUrl?: string
  metadata?: Record<string, unknown>
}

export interface PaymentResponse {
  success: boolean
  transactionId?: string
  providerReference?: string
  status: "initiated" | "pending" | "success" | "failed"
  redirectUrl?: string
  errorMessage?: string
  /** Provider-specific extra data worth persisting (e.g. Orange's notif_token) */
  raw?: Record<string, unknown>
}

export interface VerifyContext {
  orderId?: string
  amount?: number
}

export interface WebhookPayload {
  provider: string
  transactionId: string
  status: "success" | "failed" | "pending"
  amount: number
  reference: string
  timestamp: number
  signature?: string
}

export abstract class PaymentProvider {
  protected apiKey: string
  protected merchantId: string

  constructor(apiKey: string, merchantId: string) {
    this.apiKey = apiKey
    this.merchantId = merchantId
  }

  abstract charge(request: PaymentRequest): Promise<PaymentResponse>
  abstract verify(transactionId: string, context?: VerifyContext): Promise<PaymentResponse>
  abstract refund(transactionId: string, amount: number): Promise<PaymentResponse>
  abstract handleWebhook(payload: WebhookPayload): Promise<boolean>
  abstract validateSignature(payload: unknown, signature: string): boolean
}

/**
 * Orange Money Provider
 *
 * Sandbox mode: fully simulated, no network calls — used until a real
 * merchant account exists (see PaymentProviderFactory).
 *
 * Real mode: implements the Orange Money Web Payment API
 * (https://developer.orange.com — "Orange Money Web Payment").
 * Flow: OAuth2 client-credentials token -> POST /v1/webpayment to create a
 * hosted payment session (returns `payment_url` the customer is redirected
 * to) -> Orange redirects back to our return_url and/or calls our notif_url
 * webhook -> POST /v1/transactionstatus to confirm the final status.
 */
export class OrangeMoneyProvider extends PaymentProvider {
  private sandboxMode: boolean
  private clientSecret: string
  private merchantKey: string
  private baseUrl: string
  private region: string
  private notifUrl?: string
  private cachedToken: { token: string; expiresAt: number } | null = null

  constructor(config: {
    clientId: string
    clientSecret: string
    merchantKey: string
    baseUrl: string
    region: string
    notifUrl?: string
    sandboxMode: boolean
  }) {
    super(config.clientId, config.merchantKey)
    this.clientSecret = config.clientSecret
    this.merchantKey = config.merchantKey
    this.baseUrl = config.baseUrl
    this.region = config.region
    this.notifUrl = config.notifUrl
    this.sandboxMode = config.sandboxMode
  }

  /**
   * OAuth2 client-credentials token, cached until shortly before expiry.
   * https://api.orange.com/oauth/v3/token
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token
    }

    const credentials = Buffer.from(`${this.apiKey}:${this.clientSecret}`).toString("base64")
    const res = await fetch(`${this.baseUrl}/oauth/v3/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Orange Money OAuth token request failed (${res.status}): ${text}`)
    }

    const data = (await res.json()) as { access_token: string; expires_in: number }
    this.cachedToken = {
      token: data.access_token,
      // renew a minute early to avoid using a token that expires mid-request
      expiresAt: Date.now() + Math.max(data.expires_in - 60, 30) * 1000,
    }
    return this.cachedToken.token
  }

  async charge(request: PaymentRequest): Promise<PaymentResponse> {
    if (this.sandboxMode) {
      const transactionId = `OM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      return {
        success: true,
        transactionId,
        providerReference: transactionId,
        status: "initiated",
      }
    }

    try {
      const token = await this.getAccessToken()
      const res = await fetch(`${this.baseUrl}/orange-money-webpay/${this.region}/v1/webpayment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          merchant_key: this.merchantKey,
          currency: request.currency,
          order_id: request.reference,
          amount: request.amount,
          return_url: request.callbackUrl,
          cancel_url: request.callbackUrl,
          notif_url: this.notifUrl,
          lang: "fr",
          reference: request.description || request.reference,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`Orange Money webpayment creation failed (${res.status}): ${text}`)
      }

      const data = (await res.json()) as {
        payment_url: string
        pay_token: string
        notif_token: string
      }

      return {
        success: true,
        transactionId: data.pay_token,
        providerReference: data.pay_token,
        status: "initiated",
        redirectUrl: data.payment_url,
        raw: { notifToken: data.notif_token },
      }
    } catch (error) {
      console.error("Orange Money charge error:", error)
      return {
        success: false,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Failed to process payment",
      }
    }
  }

  /**
   * https://api.orange.com/orange-money-webpay/{region}/v1/transactionstatus
   * Requires the order_id and amount used when creating the payment, plus
   * the pay_token (passed here as transactionId).
   */
  async verify(transactionId: string, context?: VerifyContext): Promise<PaymentResponse> {
    if (this.sandboxMode) {
      return { success: true, transactionId, status: "success" }
    }

    if (!context?.orderId || context.amount === undefined) {
      return {
        success: false,
        status: "failed",
        errorMessage: "Missing order_id/amount to verify an Orange Money transaction",
      }
    }

    try {
      const token = await this.getAccessToken()
      const res = await fetch(
        `${this.baseUrl}/orange-money-webpay/${this.region}/v1/transactionstatus`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            order_id: context.orderId,
            amount: context.amount,
            pay_token: transactionId,
          }),
        }
      )

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`Orange Money transactionstatus failed (${res.status}): ${text}`)
      }

      const data = (await res.json()) as { status: string }
      const status = this.mapTransactionStatus(data.status)

      return { success: status !== "failed", transactionId, status }
    } catch (error) {
      console.error("Orange Money verify error:", error)
      return {
        success: false,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Failed to verify payment",
      }
    }
  }

  private mapTransactionStatus(orangeStatus: string): PaymentResponse["status"] {
    switch (orangeStatus?.toUpperCase()) {
      case "SUCCESS":
        return "success"
      case "FAILED":
      case "EXPIRED":
        return "failed"
      case "INITIATED":
      case "PENDING":
      default:
        return "pending"
    }
  }

  async refund(_transactionId: string, _amount: number): Promise<PaymentResponse> {
    if (this.sandboxMode) {
      return { success: true, transactionId: `OM_REFUND_${Date.now()}`, status: "success" }
    }

    // The Orange Money Web Payment API does not expose a self-service refund
    // endpoint in most markets — refunds normally go through the merchant
    // back-office (Orange Money Marchand portal) or a separate agreement.
    return {
      success: false,
      status: "failed",
      errorMessage: "Refunds are not supported via the Orange Money Web Payment API — process them through the merchant back-office.",
    }
  }

  async handleWebhook(payload: WebhookPayload): Promise<boolean> {
    if (!this.validateSignature(payload, payload.signature || "")) {
      console.error("Invalid Orange Money webhook token")
      return false
    }
    return true
  }

  /**
   * Orange's webhook includes the `notif_token` generated when the payment
   * was created; the caller is expected to compare it against the token it
   * stored for that payment (passed in here as `signature`).
   */
  validateSignature(payload: unknown, signature: string): boolean {
    if (this.sandboxMode) return true
    if (!payload || typeof payload !== "object") return false
    const notifToken = (payload as Record<string, unknown>).notif_token
    return typeof notifToken === "string" && notifToken.length > 0 && notifToken === signature
  }
}

/**
 * Stripe Provider
 */
export class StripeProvider extends PaymentProvider {
  async charge(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // TODO: Implement Stripe API call
      throw new Error("Stripe provider not yet implemented")
    } catch (error) {
      console.error("Stripe charge error:", error)
      return {
        success: false,
        status: "failed",
        errorMessage: "Failed to process payment",
      }
    }
  }

  async verify(_transactionId: string, _context?: VerifyContext): Promise<PaymentResponse> {
    throw new Error("Stripe provider not yet implemented")
  }

  async refund(_transactionId: string, _amount: number): Promise<PaymentResponse> {
    throw new Error("Stripe provider not yet implemented")
  }

  async handleWebhook(_payload: WebhookPayload): Promise<boolean> {
    throw new Error("Stripe provider not yet implemented")
  }

  validateSignature(_payload: unknown, _signature: string): boolean {
    throw new Error("Stripe provider not yet implemented")
  }
}

/**
 * Payment Provider Factory
 */
export class PaymentProviderFactory {
  static create(
    provider: string = process.env.PAYMENT_PROVIDER || "orange_money_sandbox"
  ): PaymentProvider {
    switch (provider) {
      case "orange_money_sandbox":
        return new OrangeMoneyProvider({
          clientId: process.env.ORANGE_MONEY_CLIENT_ID || "sandbox",
          clientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET || "sandbox",
          merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY || "demo",
          baseUrl: process.env.ORANGE_MONEY_API_BASE_URL || "https://api.orange.com",
          region: process.env.ORANGE_MONEY_REGION || "bf",
          notifUrl: process.env.ORANGE_MONEY_NOTIF_URL,
          sandboxMode: true,
        })
      case "orange_money_production":
        return new OrangeMoneyProvider({
          clientId: process.env.ORANGE_MONEY_CLIENT_ID || "",
          clientSecret: process.env.ORANGE_MONEY_CLIENT_SECRET || "",
          merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY || "",
          baseUrl: process.env.ORANGE_MONEY_API_BASE_URL || "https://api.orange.com",
          region: process.env.ORANGE_MONEY_REGION || "bf",
          notifUrl: process.env.ORANGE_MONEY_NOTIF_URL,
          sandboxMode: false,
        })
      case "stripe":
        return new StripeProvider(
          process.env.STRIPE_SECRET_KEY || "",
          process.env.STRIPE_MERCHANT_ID || ""
        )
      default:
        throw new Error(`Unknown payment provider: ${provider}`)
    }
  }
}

/**
 * Payment Service Wrapper
 */
export class PaymentService {
  private provider: PaymentProvider

  constructor(provider?: PaymentProvider) {
    this.provider = provider || PaymentProviderFactory.create()
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    return this.provider.charge(request)
  }

  async verifyPayment(transactionId: string, context?: VerifyContext): Promise<PaymentResponse> {
    return this.provider.verify(transactionId, context)
  }

  async processRefund(transactionId: string, amount: number): Promise<PaymentResponse> {
    return this.provider.refund(transactionId, amount)
  }

  async handleWebhook(payload: WebhookPayload): Promise<boolean> {
    return this.provider.handleWebhook(payload)
  }
}
