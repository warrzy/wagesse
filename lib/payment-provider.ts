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
  abstract verify(transactionId: string): Promise<PaymentResponse>
  abstract refund(transactionId: string, amount: number): Promise<PaymentResponse>
  abstract handleWebhook(payload: WebhookPayload): Promise<boolean>
  abstract validateSignature(payload: unknown, signature: string): boolean
}

/**
 * Orange Money Provider (Sandbox for Development)
 */
export class OrangeMoneyProvider extends PaymentProvider {
  private sandboxMode: boolean = true

  constructor(apiKey: string, merchantId: string, sandboxMode = true) {
    super(apiKey, merchantId)
    this.sandboxMode = sandboxMode
  }

  async charge(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // In production, call real Orange Money API
      // For now, simulate the API call
      
      if (this.sandboxMode) {
        // Sandbox: Generate mock transaction ID
        const transactionId = `OM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Sandbox: Simulate success
        return {
          success: true,
          transactionId,
          providerReference: transactionId,
          status: "initiated",
          redirectUrl: `https://sandbox.orange.bf/payment/${transactionId}`,
        }
      }

      // Production implementation would go here
      throw new Error("Production mode not yet implemented")
    } catch (error) {
      console.error("Orange Money charge error:", error)
      return {
        success: false,
        status: "failed",
        errorMessage: "Failed to process payment",
      }
    }
  }

  async verify(transactionId: string): Promise<PaymentResponse> {
    if (this.sandboxMode) {
      // Sandbox: Always return success (in production, verify with API)
      return {
        success: true,
        transactionId,
        status: "success",
      }
    }

    throw new Error("Production mode not yet implemented")
  }

  async refund(transactionId: string, amount: number): Promise<PaymentResponse> {
    if (this.sandboxMode) {
      const refundId = `OM_REFUND_${Date.now()}`
      return {
        success: true,
        transactionId: refundId,
        status: "success",
      }
    }

    throw new Error("Production mode not yet implemented")
  }

  async handleWebhook(payload: WebhookPayload): Promise<boolean> {
    // Verify and process webhook
    if (!this.validateSignature(payload, payload.signature || "")) {
      console.error("Invalid webhook signature")
      return false
    }

    console.log("Webhook processed:", payload)
    return true
  }

  validateSignature(payload: unknown, signature: string): boolean {
    // In production, verify HMAC signature
    // For now, in sandbox, accept all
    if (this.sandboxMode) return true

    // Production implementation would verify signature
    return false
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

  async verify(transactionId: string): Promise<PaymentResponse> {
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
        return new OrangeMoneyProvider(
          process.env.ORANGE_MONEY_API_KEY || "sandbox",
          process.env.ORANGE_MONEY_MERCHANT_ID || "demo",
          true
        )
      case "orange_money_production":
        return new OrangeMoneyProvider(
          process.env.ORANGE_MONEY_API_KEY || "",
          process.env.ORANGE_MONEY_MERCHANT_ID || "",
          false
        )
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

  async verifyPayment(transactionId: string): Promise<PaymentResponse> {
    return this.provider.verify(transactionId)
  }

  async processRefund(transactionId: string, amount: number): Promise<PaymentResponse> {
    return this.provider.refund(transactionId, amount)
  }

  async handleWebhook(payload: WebhookPayload): Promise<boolean> {
    return this.provider.handleWebhook(payload)
  }
}
