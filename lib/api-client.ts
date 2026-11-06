import { ApiResponse } from "@/lib/types"

interface AuthResponseData {
  token: string
  user: {
    id: string
    phone: string
    firstName: string | null
    lastName: string | null
    role: string
    phoneVerified?: string | null
  }
  phoneVerificationRequired?: boolean
}

export type StoredUser = AuthResponseData["user"]

class APIClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL?: string) {
    const resolvedBaseURL =
      baseURL ||
      (typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")

    this.baseURL = resolvedBaseURL
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

  getToken(): string | null {
    return this.token
  }

  setUser(user: StoredUser): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_user", JSON.stringify(user))
    }
  }

  getUser(): StoredUser | null {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem("auth_user")
    if (!raw) return null
    try {
      return JSON.parse(raw) as StoredUser
    } catch {
      return null
    }
  }

  clearToken(): void {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
      localStorage.removeItem("auth_user")
    }
  }

  async getAdminDashboard() {
    return this.request("GET", "/admin/dashboard")
  }

  async adminListAnnonces(params: {
    page?: number
    pageSize?: number
    q?: string
    status?: string
    materialId?: string
    customerId?: string
    createdFrom?: string
    createdTo?: string
    hasQuotes?: boolean
    hasAssigned?: boolean
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.status) sp.set("status", params.status)
    if (params.materialId) sp.set("materialId", params.materialId)
    if (params.customerId) sp.set("customerId", params.customerId)
    if (params.createdFrom) sp.set("createdFrom", params.createdFrom)
    if (params.createdTo) sp.set("createdTo", params.createdTo)
    if (params.hasQuotes !== undefined) sp.set("hasQuotes", String(params.hasQuotes))
    if (params.hasAssigned !== undefined) sp.set("hasAssigned", String(params.hasAssigned))
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/annonces${qs ? `?${qs}` : ""}`)
  }

  async adminGetAnnonce(id: string) {
    return this.request("GET", `/admin/annonces/${id}`)
  }

  async adminCreateAnnonce(data: {
    customerId: string
    requestType?: string
    materialId?: string | null
    materialDescription?: string | null
    quantity: number
    unit: string
    pickupCity: string
    pickupSector?: string | null
    dropoffCity: string
    dropoffSector?: string | null
    requestedDate: string
    urgency?: string
    budgetEstimate?: number | null
    currencyCode?: string
    notes?: string | null
    status?: string
  }) {
    return this.request("POST", "/admin/annonces", data)
  }

  async adminUpdateAnnonce(id: string, data: Record<string, any>) {
    return this.request("PATCH", `/admin/annonces/${id}`, data)
  }

  async adminListOffres(params: {
    page?: number
    pageSize?: number
    q?: string
    status?: string
    requestId?: string
    truckerId?: string
    customerId?: string
    createdFrom?: string
    createdTo?: string
    accepted?: boolean
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.status) sp.set("status", params.status)
    if (params.requestId) sp.set("requestId", params.requestId)
    if (params.truckerId) sp.set("truckerId", params.truckerId)
    if (params.customerId) sp.set("customerId", params.customerId)
    if (params.createdFrom) sp.set("createdFrom", params.createdFrom)
    if (params.createdTo) sp.set("createdTo", params.createdTo)
    if (params.accepted !== undefined) sp.set("accepted", String(params.accepted))
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/offres${qs ? `?${qs}` : ""}`)
  }

  async adminGetOffre(id: string) {
    return this.request("GET", `/admin/offres/${id}`)
  }

  async adminCreateOffre(data: {
    requestId: string
    truckerId: string
    vehicleId?: string | null
    materialId?: string | null
    totalPrice: number
    pricePerTrip?: number | null
    numberOfTrips?: number
    currencyCode?: string
    proposedDate: string
    validUntil: string
    estimatedDuration?: string | null
    comments?: string | null
    specialConditions?: string | null
    status?: string
  }) {
    return this.request("POST", "/admin/offres", data)
  }

  async adminUpdateOffre(id: string, data: Record<string, any>) {
    return this.request("PATCH", `/admin/offres/${id}`, data)
  }

  async adminListTransports(params: {
    page?: number
    pageSize?: number
    q?: string
    status?: string
    customerId?: string
    truckerId?: string
    scheduledFrom?: string
    scheduledTo?: string
    hasPayment?: boolean
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.status) sp.set("status", params.status)
    if (params.customerId) sp.set("customerId", params.customerId)
    if (params.truckerId) sp.set("truckerId", params.truckerId)
    if (params.scheduledFrom) sp.set("scheduledFrom", params.scheduledFrom)
    if (params.scheduledTo) sp.set("scheduledTo", params.scheduledTo)
    if (params.hasPayment !== undefined) sp.set("hasPayment", String(params.hasPayment))
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/transports${qs ? `?${qs}` : ""}`)
  }

  async adminGetTransport(id: string) {
    return this.request("GET", `/admin/transports/${id}`)
  }

  async adminCreateTransport(data: {
    requestId: string
    truckerId: string
    vehicleId: string
    contractPrice: number
    contractCurrency?: string
    scheduledDate: string
    status?: string
    platformCommissionRate?: number
    platformCommission?: number
  }) {
    return this.request("POST", "/admin/transports", data)
  }

  async adminUpdateTransport(id: string, data: Record<string, any>) {
    return this.request("PATCH", `/admin/transports/${id}`, data)
  }

  async adminListUtilisateurs(params: {
    page?: number
    pageSize?: number
    q?: string
    role?: string
    status?: string
    createdFrom?: string
    createdTo?: string
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.role) sp.set("role", params.role)
    if (params.status) sp.set("status", params.status)
    if (params.createdFrom) sp.set("createdFrom", params.createdFrom)
    if (params.createdTo) sp.set("createdTo", params.createdTo)
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/utilisateurs${qs ? `?${qs}` : ""}`)
  }

  async adminGetUtilisateur(id: string) {
    return this.request("GET", `/admin/utilisateurs/${id}`)
  }

  async adminCreateUtilisateur(data: {
    email: string
    phone: string
    password: string
    firstName?: string | null
    lastName?: string | null
    role?: string
    status?: string
  }) {
    return this.request("POST", "/admin/utilisateurs", data)
  }

  async adminUpdateUtilisateur(id: string, data: Record<string, any>) {
    return this.request("PATCH", `/admin/utilisateurs/${id}`, data)
  }

  async adminListCamionneurs(params: {
    page?: number
    pageSize?: number
    q?: string
    truckerType?: string
    verificationStatus?: string
    isAvailable?: boolean
    organizationId?: string
    createdFrom?: string
    createdTo?: string
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.truckerType) sp.set("truckerType", params.truckerType)
    if (params.verificationStatus) sp.set("verificationStatus", params.verificationStatus)
    if (params.isAvailable !== undefined) sp.set("isAvailable", String(params.isAvailable))
    if (params.organizationId) sp.set("organizationId", params.organizationId)
    if (params.createdFrom) sp.set("createdFrom", params.createdFrom)
    if (params.createdTo) sp.set("createdTo", params.createdTo)
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/camionneurs${qs ? `?${qs}` : ""}`)
  }

  async adminGetCamionneur(id: string) {
    return this.request("GET", `/admin/camionneurs/${id}`)
  }

  async adminCreateCamionneur(data: Record<string, any>) {
    return this.request("POST", "/admin/camionneurs", data)
  }

  async adminUpdateCamionneur(id: string, data: Record<string, any>) {
    return this.request("PATCH", `/admin/camionneurs/${id}`, data)
  }

  async adminListPaiements(params: {
    page?: number
    pageSize?: number
    q?: string
    status?: string
    type?: string
    providerName?: string
    payer?: string
    customerId?: string
    missionId?: string
    initiatedFrom?: string
    initiatedTo?: string
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.status) sp.set("status", params.status)
    if (params.type) sp.set("type", params.type)
    if (params.providerName) sp.set("providerName", params.providerName)
    if (params.payer) sp.set("payer", params.payer)
    if (params.customerId) sp.set("customerId", params.customerId)
    if (params.missionId) sp.set("missionId", params.missionId)
    if (params.initiatedFrom) sp.set("initiatedFrom", params.initiatedFrom)
    if (params.initiatedTo) sp.set("initiatedTo", params.initiatedTo)
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/paiements${qs ? `?${qs}` : ""}`)
  }

  async adminGetPaiement(id: string) {
    return this.request("GET", `/admin/paiements/${id}`)
  }

  async adminListTransactions(params: {
    page?: number
    pageSize?: number
    q?: string
    category?: string
    source?: string
    subtype?: string
    status?: string
    userId?: string
    dateFrom?: string
    dateTo?: string
    amountMin?: number
    amountMax?: number
    creditsMin?: number
    creditsMax?: number
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.category) sp.set("category", params.category)
    if (params.source) sp.set("source", params.source)
    if (params.subtype) sp.set("subtype", params.subtype)
    if (params.status) sp.set("status", params.status)
    if (params.userId) sp.set("userId", params.userId)
    if (params.dateFrom) sp.set("dateFrom", params.dateFrom)
    if (params.dateTo) sp.set("dateTo", params.dateTo)
    if (params.amountMin !== undefined) sp.set("amountMin", String(params.amountMin))
    if (params.amountMax !== undefined) sp.set("amountMax", String(params.amountMax))
    if (params.creditsMin !== undefined) sp.set("creditsMin", String(params.creditsMin))
    if (params.creditsMax !== undefined) sp.set("creditsMax", String(params.creditsMax))
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/transactions${qs ? `?${qs}` : ""}`)
  }

  async adminGetTransactionDetails(source: string, id: string) {
    return this.request("GET", `/admin/transactions/${encodeURIComponent(source)}/${id}`)
  }

  async adminListWallets(params: {
    page?: number
    pageSize?: number
    q?: string
    balanceMin?: number
    balanceMax?: number
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.balanceMin !== undefined) sp.set("balanceMin", String(params.balanceMin))
    if (params.balanceMax !== undefined) sp.set("balanceMax", String(params.balanceMax))
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/wallet${qs ? `?${qs}` : ""}`)
  }

  async adminGetWallet(id: string) {
    return this.request("GET", `/admin/wallet/${id}`)
  }

  async adminListAbonnements(params: {
    page?: number
    pageSize?: number
    q?: string
    tier?: string
    isActive?: boolean
    isPublished?: boolean
    isVisible?: boolean
    archived?: boolean
    sort?: string
  }) {
    const sp = new URLSearchParams()

    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.tier) sp.set("tier", params.tier)
    if (params.isActive !== undefined) sp.set("isActive", String(params.isActive))
    if (params.isPublished !== undefined) sp.set("isPublished", String(params.isPublished))
    if (params.isVisible !== undefined) sp.set("isVisible", String(params.isVisible))
    if (params.archived !== undefined) sp.set("archived", String(params.archived))
    if (params.sort) sp.set("sort", params.sort)

    const qs = sp.toString()
    return this.request("GET", `/admin/abonnements${qs ? `?${qs}` : ""}`)
  }

  async adminGetAbonnementPlan(id: string) {
    return this.request("GET", `/admin/abonnements/${id}`)
  }

  async adminCreateAbonnementPlan(data: {
    code?: string | null
    name: string
    tier: string
    description?: string | null
    monthlyPrice: number
    annualPrice?: number | null
    currency?: string
    trialDays?: number
    monthlyCredits?: number
    unlockCostCredits?: number
    monthlyBoosts?: number
    cycleDays?: number
    benefits?: any
    features?: any
    isPublished?: boolean
    isVisible?: boolean
    badge?: string | null
    platformCommissionRate?: number
    sortOrder?: number
    maxVehicles?: number
    maxRequests?: number | null
    maxProposals?: number | null
    isActive?: boolean
  }) {
    return this.request("POST", "/admin/abonnements", data)
  }

  async adminUpdateAbonnementPlan(id: string, data: Record<string, any>) {
    return this.request("PATCH", `/admin/abonnements/${id}`, data)
  }

  async adminListCreditPacks(params: {
    page?: number
    pageSize?: number
    q?: string
    isActive?: boolean
    sort?: string
  }) {
    const query = new URLSearchParams()
    if (params.page) query.set("page", String(params.page))
    if (params.pageSize) query.set("pageSize", String(params.pageSize))
    if (params.q) query.set("q", String(params.q))
    if (typeof params.isActive === "boolean") query.set("isActive", String(params.isActive))
    if (params.sort) query.set("sort", String(params.sort))
    const qs = query.toString()
    return this.request("GET", `/admin/credit-packs${qs ? `?${qs}` : ""}`)
  }

  async adminCreateCreditPack(data: {
    code: string
    title: string
    priceXof: number
    credits: number
    badge?: string | null
    isActive?: boolean
    sortOrder?: number
  }) {
    return this.request("POST", "/admin/credit-packs", data)
  }

  async adminGetCreditPack(id: string) {
    return this.request("GET", `/admin/credit-packs/${id}`)
  }

  async adminUpdateCreditPack(id: string, data: Record<string, any>) {
    return this.request("PATCH", `/admin/credit-packs/${id}`, data)
  }

  async adminDeleteCreditPack(id: string) {
    return this.request("DELETE", `/admin/credit-packs/${id}`)
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

    // Ensure we always pick up the latest token on client-side navigation
    if (typeof window !== "undefined") {
      const t = localStorage.getItem("auth_token")
      if (t) this.token = t
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

      const raw = await response.text()
      const result = raw
        ? (() => {
            try {
              return JSON.parse(raw)
            } catch {
              return {}
            }
          })()
        : {}

      if (!response.ok) {
        return {
          success: false,
          error: (result as any)?.error || "An error occurred",
          code: (result as any)?.code,
        }
      }

      return {
        success: true,
        data: (result as any)?.data,
        message: (result as any)?.message,
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
    return this.request<AuthResponseData>("POST", "/auth/login", { phone, password })
  }

  async signup(data: {
    phone: string
    password: string
    firstName: string
    lastName: string
    role: "CLIENT" | "TRUCKER"
  }) {
    return this.request<AuthResponseData>("POST", "/auth/signup", data)
  }

  async verifyOTP(phone: string, code: string) {
    return this.request("POST", "/auth/verify-otp", { phone, code })
  }

  async resendOTP(phone: string) {
    return this.request("POST", "/auth/resend-otp", { phone })
  }

  async getPaymentMode() {
    return this.request<{ mode: "MANUAL" | "PAYDUNYA" | "PROVIDER"; instructions: string | null }>("GET", "/payments/mode")
  }

  async getCommercialOrders() {
    return this.request("GET", "/commercial-orders")
  }

  async getCommercialOrder(id: string) {
    return this.request("GET", `/commercial-orders/${id}`)
  }

  async adminListCommandes(params: { page?: number; pageSize?: number; q?: string; status?: string; kind?: string }) {
    const sp = new URLSearchParams()
    if (params.page) sp.set("page", String(params.page))
    if (params.pageSize) sp.set("pageSize", String(params.pageSize))
    if (params.q) sp.set("q", params.q)
    if (params.status) sp.set("status", params.status)
    if (params.kind) sp.set("kind", params.kind)
    const qs = sp.toString()
    return this.request("GET", `/admin/commandes${qs ? `?${qs}` : ""}`)
  }

  async adminGetCommande(id: string) {
    return this.request("GET", `/admin/commandes/${id}`)
  }

  async adminApproveCommande(id: string, note?: string) {
    return this.request("POST", `/admin/commandes/${id}/approve`, { note })
  }

  async adminRejectCommande(id: string, note: string) {
    return this.request("POST", `/admin/commandes/${id}/reject`, { note })
  }

  async adminAdjustWallet(id: string, data: { amount: number; reason: string; idempotencyKey: string }) {
    return this.request("POST", `/admin/wallet/${id}`, data)
  }

  async logout() {
    this.clearToken()
    return { success: true }
  }

  async getCurrentUser() {
    return this.request("GET", "/auth/me")
  }

  async getCreditBalance() {
    return this.request<{ balance: number }>("GET", "/credits/balance")
  }

  async getCreditPacks() {
    return this.request("GET", "/credits/packs")
  }

  async purchaseCredits(data: { packCode: string; paymentMethod: string; phoneNumber?: string }, returnTo?: string) {
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
    return this.request("POST", `/credits/purchase${query}`, data)
  }

  async purchaseSubscription(data: { planCode: string; paymentMethod: string; phoneNumber?: string }, returnTo?: string) {
    const query = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
    return this.request("POST", `/subscription/purchase${query}`, data)
  }

  // Subscription
  async getSubscriptionPlans() {
    return this.request("GET", "/subscription/plans")
  }

  async getCurrentSubscription() {
    return this.request("GET", "/subscription")
  }

  async activateSubscription(planCode: string) {
    return this.request("POST", "/subscription/activate", { planCode })
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

  async browseTransportRequests(filters?: unknown) {
    const query = filters ? `?${new URLSearchParams(filters as Record<string, string>).toString()}` : ""
    return this.request("GET", `/requests/browse${query}`)
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

  async unlockRequestContacts(id: string) {
    return this.request("POST", `/requests/${id}/unlock-contacts`, {})
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

  async confirmPayment(id: string) {
    return this.request("POST", `/payments/${id}/confirm`, {})
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
