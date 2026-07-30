// Brand & App Configuration
export const BRAND_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "Wagesse",
  shortName: "Wagesse",
  tagline: "Marketplace de fret en Afrique de l'Ouest",
  description:
    "Plateforme de mise en relation entre clients et camionneurs pour les transports de matériaux au Burkina Faso",
  website: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  colors: {
    primary: "#E8714D", // Terracotta / Orange
    secondary: "#8B6F47", // Earth
    accent: "#D4B896", // Sand
    dark: "#2C3E50", // Anthracite
    light: "#F5F1ED", // Cream
    success: "#4CAF50",
    warning: "#FFA500",
    danger: "#EF4444",
  },
  social: {
    facebook: "https://facebook.com/wagesse",
    whatsapp: "https://wa.me/226xxxxxxxxxxx",
    email: "contact@wagesse.bf",
  },
}

// Currency Configuration
export const CURRENCY_CONFIG = {
  code: "XOF",
  symbol: "Fr",
  name: "Franc CFA",
  locale: "fr-BF",
}

// Pricing Configuration
export const PRICING_CONFIG = {
  contactUnlockFee: 2500, // XOF
  contactUnlockFeeRanges: [
    { distanceMax: 50, fee: 1500 },
    { distanceMax: 100, fee: 2500 },
    { distanceMax: 200, fee: 3500 },
    { distanceMax: Infinity, fee: 5000 },
  ],
  platformCommissionDefault: 0.1, // 10%
  platformCommissionRanges: [
    { tier: "discovery", rate: 0.12 },
    { tier: "professional", rate: 0.1 },
    { tier: "fleet", rate: 0.08 },
  ],
}

// Subscription Tiers (easily configurable)
export const SUBSCRIPTION_TIERS = {
  discovery: {
    name: "Découverte",
    monthlyPrice: 5000,
    annualPrice: 50000,
    maxVehicles: 1,
    maxRequests: 20, // per month
    platformCommissionRate: 0.12,
    features: [
      "Listing basique",
      "Jusqu'à 20 demandes/mois",
      "1 véhicule",
      "Support par email",
    ],
  },
  professional: {
    name: "Professionnel",
    monthlyPrice: 15000,
    annualPrice: 150000,
    maxVehicles: 5,
    maxRequests: null, // unlimited
    platformCommissionRate: 0.1,
    features: [
      "Listing prioritaire",
      "Demandes illimitées",
      "Jusqu'à 5 véhicules",
      "Statistiques détaillées",
      "Support prioritaire",
      "Badge premium",
    ],
  },
  fleet: {
    name: "Flotte",
    monthlyPrice: 50000,
    annualPrice: 500000,
    maxVehicles: null, // unlimited
    maxRequests: null, // unlimited
    platformCommissionRate: 0.08,
    features: [
      "Listing très prioritaire",
      "Demandes illimitées",
      "Véhicules illimités",
      "Gestion d'équipe",
      "Export transactions",
      "API accès",
      "Support dédié",
      "Contrats récurrents",
    ],
  },
}

// Burkina Faso Cities & Provinces
export const BF_CITIES = [
  { name: "Ouagadougou", province: "Kadiogo", lat: 12.3667, lng: -1.5197 },
  { name: "Bobo-Dioulasso", province: "Houet", lat: 12.6547, lng: -4.285 },
  { name: "Koudougou", province: "Boulkiemdé", lat: 12.2628, lng: -2.63 },
  { name: "Ouahigouya", province: "Yatenga", lat: 13.5833, lng: -2.4167 },
  { name: "Banfora", province: "Comoe", lat: 10.6315, lng: -4.7606 },
  { name: "Kaya", province: "Sanmatenga", lat: 13.90, lng: -1.27 },
  { name: "Manga", province: "Zoundweogo", lat: 12.1667, lng: -1.5 },
  { name: "Ziniaré", province: "Kadiogo", lat: 12.2833, lng: -1.15 },
]

// Material Types
export const MATERIAL_TYPES = [
  { id: "sand", name: "Sable", category: "sand", density: 1500 },
  { id: "gravel", name: "Gravier", category: "gravel", density: 1700 },
  { id: "granite", name: "Granite", category: "stone", density: 2700 },
  { id: "earth", name: "Terre/Remblai", category: "earth", density: 1600 },
  { id: "concrete", name: "Béton", category: "concrete", density: 2400 },
  { id: "bricks", name: "Briques", category: "materials", density: 1900 },
  { id: "metal", name: "Ferraille/Métaux", category: "metal", density: 7850 },
  { id: "waste", name: "Déchets de chantier", category: "waste", density: 1200 },
]

// Truck Types
export const TRUCK_TYPES = [
  { id: "dump3", name: "Benne 3 essieux", minCapacity: 15, maxCapacity: 20 },
  { id: "dump4", name: "Benne 4 essieux", minCapacity: 20, maxCapacity: 25 },
  { id: "dump5", name: "Benne 5 essieux", minCapacity: 25, maxCapacity: 32 },
  { id: "articulated", name: "Semi-remorque", minCapacity: 25, maxCapacity: 35 },
  { id: "flatbed", name: "Plateau", minCapacity: 10, maxCapacity: 25 },
  { id: "container", name: "Porte-conteneurs", minCapacity: 20, maxCapacity: 30 },
]

// Quantity Units
export const QUANTITY_UNITS = [
  { id: "tonnes", name: "Tonnes", symbol: "t" },
  { id: "m3", name: "Mètres cubes", symbol: "m³" },
  { id: "trips", name: "Voyages", symbol: "voyage(s)" },
  { id: "full_load", name: "Chargement complet", symbol: "chargement" },
]

// Payment Methods
export const PAYMENT_METHODS = [
  { id: "orange_money", name: "Orange Money", provider: "orange" },
  { id: "mobile_money", name: "Mobile Money", provider: "aggregator" },
  { id: "card", name: "Carte bancaire", provider: "stripe" },
]

// Request Status Labels
export const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_PAYMENT: "Paiement en attente",
  PUBLISHED: "Publiée",
  MATCHED: "En matching",
  IN_NEGOTIATION: "En négociation",
  ASSIGNED: "Assignée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Complétée",
  CANCELLED: "Annulée",
  DISPUTED: "En litige",
}

// Mission Status Labels
export const MISSION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_PAYMENT: "Paiement en attente",
  PAID: "Payée",
  PENDING_ACCEPTANCE: "En attente d'acceptation",
  ACCEPTED: "Acceptée",
  TRUCK_EN_ROUTE_PICKUP: "Camion en route vers le chargement",
  ARRIVED_PICKUP: "Arrivée au chargement",
  LOADING_IN_PROGRESS: "Chargement en cours",
  EN_ROUTE_DELIVERY: "En route vers la livraison",
  ARRIVED_DELIVERY: "Arrivée à destination",
  DELIVERED: "Livrée",
  PENDING_CONFIRMATION: "En attente de confirmation",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  DISPUTED: "En litige",
  REFUNDED: "Remboursée",
}

// Feature Flags
export const FEATURES = {
  RECURRING_MISSIONS: process.env.FEATURE_RECURRING_MISSIONS === "true",
  ADVANCED_MATCHING: process.env.FEATURE_ADVANCED_MATCHING === "true",
  SUBSCRIPTION_PLANS: process.env.FEATURE_SUBSCRIPTION_PLANS === "true",
}
