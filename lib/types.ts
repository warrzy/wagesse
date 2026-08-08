// User & Auth
export interface AuthUser {
  id: string
  email: string
  phone: string
  firstName?: string
  lastName?: string
  role: "VISITOR" | "CLIENT" | "TRUCKER" | "OPERATOR" | "ADMIN"
  profilePhoto?: string
}

export interface LoginCredentials {
  phone: string
  password: string
}

export interface SignupData {
  phone: string
  password: string
  firstName: string
  lastName: string
  role: "CLIENT" | "TRUCKER"
}

// Customer Profile
export interface CustomerProfile {
  id: string
  userId: string
  companyName?: string
  companyType:
    | "INDIVIDUAL"
    | "CONSTRUCTION_COMPANY"
    | "QUARRY"
    | "MINING_COMPANY"
    | "MATERIAL_TRADER"
    | "TRANSPORT_SOCIETY"
    | "OTHER"
  city: string
  taxNumber?: string
  totalRequests: number
  totalMissions: number
  averageRating: number
}

// Trucker Profile
export interface TruckerProfile {
  id: string
  userId: string
  truckerType: "INDEPENDENT_DRIVER" | "TRUCK_OWNER" | "TRANSPORT_COMPANY"
  organizationId?: string
  city: string
  averageRating: number
  totalMissions: number
  acceptanceRate: number
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED"
  isAvailable: boolean
  subscriptionPlan?: string
}

// Vehicle
export interface Vehicle {
  id: string
  truckerId: string
  licensePlate: string
  brand: string
  model: string
  year: number
  vehicleType: string
  capacityTonnes: number
  capacityM3?: number
  isOperational: boolean
  photos: string[]
  insuranceExpiry?: Date
  inspectionExpiry?: Date
}

// Transport Request
export interface TransportRequest {
  id: string
  customerId: string
  requestType: "ONE_TIME" | "RECURRING" | "URGENT"
  material?: string
  quantity: number
  unit: "TONNES" | "CUBIC_METERS" | "NUMBER_OF_TRIPS" | "FULL_TRUCK_LOAD"
  pickupCity: string
  dropoffCity: string
  requestedDate: Date
  urgency: "STANDARD" | "URGENT" | "VERY_URGENT"
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PUBLISHED"
    | "MATCHED"
    | "IN_NEGOTIATION"
    | "COMPLETED"
    | "CANCELLED"
  budgetEstimate?: number
  photos: string[]
}

// Quote / Proposal
export interface Quote {
  id: string
  requestId: string
  truckerId: string
  totalPrice: number
  pricePerTrip?: number
  numberOfTrips: number
  proposedDate: Date
  validUntil: Date
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED"
  comments?: string
}

// Mission
export interface Mission {
  id: string
  requestId: string
  customerId: string
  truckerId: string
  vehicleId: string
  missionReference: string
  contractPrice: number
  scheduledDate: Date
  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "PAID"
    | "ACCEPTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "DISPUTED"
  platformCommission?: number
  createdAt: Date
}

// Payment
export interface Payment {
  id: string
  payer: string
  amount: number
  currency: string
  type: "CONTACT_UNLOCK" | "MISSION_PAYMENT" | "SUBSCRIPTION" | "REFUND"
  status:
    | "INITIATED"
    | "PENDING"
    | "SUCCESSFUL"
    | "FAILED"
    | "CANCELLED"
    | "REFUNDED"
  reference: string
  providerName: string
  providerReference?: string
  createdAt: Date
  confirmedAt?: Date
}

// Transaction
export interface Transaction {
  id: string
  fromUser: string
  toUser: string
  amount: number
  type: string
  status: "pending" | "confirmed" | "cancelled"
  createdAt: Date
}

// Notification
export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: Date
}

// Rating
export interface Rating {
  id: string
  raterId: string
  truckerId: string
  missionId: string
  score: number
  category: string
  comment?: string
  ratedAt: Date
}

// Dispute
export interface Dispute {
  id: string
  missionId: string
  filedBy: "customer" | "trucker"
  description: string
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED"
  createdAt: Date
}

// Matching Result
export interface MatchResult {
  truckerId: string
  matchScore: number
  trucker: TruckerProfile
  vehicle: Vehicle
  estimatedPrice: number
  scoringBreakdown: {
    distance: number
    availability: number
    rating: number
    documentStatus: number
    acceptanceRate: number
  }
}

// API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form Data
export interface CreateTransportRequestData {
  material: string
  quantity: number
  unit: string
  pickupCity: string
  pickupSector?: string
  pickupLat?: number
  pickupLng?: number
  dropoffCity: string
  dropoffSector?: string
  dropoffLat?: number
  dropoffLng?: number
  requestedDate: Date
  urgency: string
  truckTypePreference?: string
  minCapacity?: number
  needsDriver: boolean
  numberOfTrucks: number
  budgetEstimate?: number
  photos: File[]
  comments?: string
}

export interface SearchFilters {
  material?: string
  city?: string
  minRating?: number
  maxPrice?: number
  vehicleType?: string
  truckerType?: string
}
