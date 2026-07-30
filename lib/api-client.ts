import { ApiResponse } from "@/lib/types"

class APIClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") {
    this.baseURL = baseURL
    this.loadToken()
  }

  private loadToken(): void {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token")
    }
  }

  setToken(token: string): void {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  }

  clearToken(): void {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
    }
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    endpoint: string,
    data?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}/api${endpoint}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: result.error || "An error occurred",
          code: result.code,
        }
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      }
    } catch (error) {
      console.error("API request failed:", error)
      return {
        success: false,
        error: "Network error",
      }
    }
  }

  // Authentication
  async login(phone: string, password: string) {
    return this.request("POST", "/auth/login", { phone, password })
  }

  async signup(data: {
    phone: string
    password: string
    firstName: string
    lastName: string
    role: "CLIENT" | "TRUCKER"
  }) {
    return this.request("POST", "/auth/signup", data)
  }

  async verifyOTP(phone: string, code: string) {
    return this.request("POST", "/auth/verify-otp", { phone, code })
  }

  async logout() {
    this.clearToken()
    return { success: true }
  }

  async getCurrentUser() {
    return this.request("GET", "/auth/me")
  }

  // Requests
  async createTransportRequest(data: unknown) {
    return this.request("POST", "/requests", data)
  }

  async getTransportRequests(filters?: unknown) {
    const query = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""
    return this.request("GET", `/requests${query}`)
  }

  async getTransportRequest(id: string) {
    return this.request("GET", `/requests/${id}`)
  }

  async updateTransportRequest(id: string, data: unknown) {
    return this.request("PUT", `/requests/${id}`, data)
  }

  async publishTransportRequest(id: string) {
    return this.request("POST", `/requests/${id}/publish`, {})
  }

  async deleteTransportRequest(id: string) {
    return this.request("DELETE", `/requests/${id}`)
  }

  // Quotes
  async createQuote(data: unknown) {
    return this.request("POST", `/quotes`, data)
  }

  async getQuotes(filters?: unknown) {
    const query = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""
    return this.request("GET", `/quotes${query}`)
  }

  async acceptQuote(quoteId: string) {
    return this.request("POST", `/quotes/${quoteId}/accept`, {})
  }

  async rejectQuote(quoteId: string) {
    return this.request("POST", `/quotes/${quoteId}/reject`, {})
  }

  async withdrawQuote(quoteId: string) {
    return this.request("POST", `/quotes/${quoteId}/withdraw`, {})
  }

  async updateQuotePrice(quoteId: string, totalPrice: number) {
    return this.request("PUT", `/quotes/${quoteId}`, { totalPrice })
  }

  // Missions
  async getMissions(filters?: unknown) {
    const query = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""
    return this.request("GET", `/missions${query}`)
  }

  async getMission(id: string) {
    return this.request("GET", `/missions/${id}`)
  }

  async updateMissionStatus(id: string, status: string) {
    return this.request("PATCH", `/missions/${id}/status`, { status })
  }

  // Payments
  async initializePayment(data: unknown) {
    return this.request("POST", "/payments", data)
  }

  async getPayment(id: string) {
    return this.request("GET", `/payments/${id}`)
  }

  // Vehicles
  async createVehicle(data: unknown) {
    return this.request("POST", "/vehicles", data)
  }

  async getVehicles() {
    return this.request("GET", "/vehicles")
  }

  // Profiles
  async getCustomerProfile() {
    return this.request("GET", "/profile/customer")
  }

  async updateCustomerProfile(data: unknown) {
    return this.request("PUT", "/profile/customer", data)
  }

  async getTruckerProfile() {
    return this.request("GET", "/profile/trucker")
  }

  async updateTruckerProfile(data: unknown) {
    return this.request("PUT", "/profile/trucker", data)
  }
}

export const apiClient = new APIClient()
