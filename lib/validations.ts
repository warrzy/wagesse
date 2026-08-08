import { z } from "zod"

// Auth Schemas
export const loginSchema = z.object({
  phone: z.string().regex(/^[0-9]{8,}$/, "Numéro de téléphone invalide"),
  password: z.string().min(8, "Le mot de passe doit avoir au moins 8 caractères"),
})

// Base signup payload — this is what actually gets sent to the API
export const signupSchema = z.object({
  phone: z.string().regex(/^[0-9]{8,}$/, "Numéro de téléphone invalide"),
  password: z.string().min(8, "Le mot de passe doit avoir au moins 8 caractères"),
  firstName: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
  role: z.enum(["CLIENT", "TRUCKER"]),
})

// Signup form schema — adds the client-only password confirmation field
export const signupFormSchema = signupSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

// Transport Request Schema
export const createTransportRequestSchema = z.object({
  material: z.string().min(1, "Le matériau est requis"),
  quantity: z.number().positive("La quantité doit être positive"),
  unit: z.enum(["TONNES", "CUBIC_METERS", "NUMBER_OF_TRIPS", "FULL_TRUCK_LOAD"]),
  pickupCity: z.string().min(1, "La ville de départ est requise"),
  pickupSector: z.string().optional(),
  dropoffCity: z.string().min(1, "La ville de destination est requise"),
  dropoffSector: z.string().optional(),
  requestedDate: z.coerce.date().refine(
    (date) => date.getTime() >= new Date(new Date().setHours(0, 0, 0, 0)).getTime(),
    { message: "La date doit être aujourd'hui ou dans le futur" }
  ),
  urgency: z.enum(["STANDARD", "URGENT", "VERY_URGENT"]).default("STANDARD"),
  minCapacity: z.number().positive().optional(),
  truckTypePreference: z.string().optional(),
  needsDriver: z.boolean().default(false),
  numberOfTrucks: z.number().int().min(1).default(1),
  budgetEstimate: z.number().positive().optional(),
  comments: z.string().optional(),
})

// Quote Schema
export const createQuoteSchema = z.object({
  requestId: z.string().cuid(),
  vehicleId: z.string().cuid("Vous devez sélectionner un véhicule"),
  totalPrice: z.number().positive("Le prix doit être positif"),
  pricePerTrip: z.number().positive().optional(),
  numberOfTrips: z.number().int().min(1).default(1),
  proposedDate: z.coerce.date(),
  validUntil: z.coerce.date(),
  comments: z.string().optional(),
  specialConditions: z.string().optional(),
})

// Payment Schema
export const createPaymentSchema = z.object({
  amount: z.number().positive("Le montant doit être positif"),
  type: z.enum(["CONTACT_UNLOCK", "CREDIT_PURCHASE", "MISSION_PAYMENT", "SUBSCRIPTION", "REFUND"]),
  paymentMethod: z.enum(["orange_money", "mobile_money", "card"]),
  phoneNumber: z.string().optional(),
  currency: z.string().default("XOF"),
})

// Customer Profile Update
export const updateCustomerProfileSchema = z.object({
  companyName: z.string().optional(),
  companyType: z
    .enum([
      "INDIVIDUAL", "CONSTRUCTION_COMPANY", "QUARRY", "MINING_COMPANY",
      "MATERIAL_TRADER", "TRANSPORT_SOCIETY", "OTHER",
    ])
    .optional(),
  city: z.string().min(1, "La ville est requise"),
  sector: z.string().optional(),
  alternatePhone: z.string().optional(),
})

// Trucker Profile Update
export const updateTruckerProfileSchema = z.object({
  city: z.string().min(1, "La ville est requise"),
  operatingLicense: z.string().optional(),
  licenseExpiry: z.coerce.date().optional(),
  orangeMoneyNumber: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
})

// Vehicle Schema
export const createVehicleSchema = z.object({
  licensePlate: z.string().min(3, "La plaque est requise"),
  brand: z.string().min(1, "La marque est requise"),
  model: z.string().min(1, "Le modèle est requis"),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  vehicleType: z.enum([
    "DUMP_TRUCK_3_AXLES", "DUMP_TRUCK_4_AXLES", "DUMP_TRUCK_5_AXLES",
    "TIPPER_TRUCK", "FLATBED", "CONTAINER_TRUCK", "ARTICULATED_TRUCK", "OTHER",
  ]),
  capacityTonnes: z.number().positive("La capacité doit être positive"),
  capacityM3: z.number().positive().optional(),
  benneType: z.string().optional(),
  insuranceExpiry: z.coerce.date().optional(),
  inspectionExpiry: z.coerce.date().optional(),
})

// Rating Schema
export const createRatingSchema = z.object({
  missionId: z.string().cuid(),
  truckerId: z.string().cuid(),
  score: z.number().int().min(1).max(5),
  category: z.string().optional(),
  comment: z.string().max(1000).optional(),
})

// Dispute Schema
export const createDisputeSchema = z.object({
  missionId: z.string().cuid(),
  description: z.string().min(10, "La description doit avoir au moins 10 caractères"),
  evidence: z.array(z.string()).default([]),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type CreateTransportRequestInput = z.infer<typeof createTransportRequestSchema>
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>
export type UpdateTruckerProfileInput = z.infer<typeof updateTruckerProfileSchema>
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
export type CreateRatingInput = z.infer<typeof createRatingSchema>
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>
