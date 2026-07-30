import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency in XOF
 */
export function formatCurrency(amount: number, currency = "XOF"): string {
  return new Intl.NumberFormat("fr-BF", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date in French locale
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("fr-BF", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d)
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("fr-BF", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

/**
 * Format phone number (Burkina Faso)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, "")
  
  // If it's 8 digits, assume Burkina number
  if (cleaned.length === 8) {
    return `+226 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`
  }
  
  // If it starts with 226, format as international
  if (cleaned.startsWith("226")) {
    const number = cleaned.slice(3)
    return `+226 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`
  }
  
  return phone
}

/**
 * Generate a shortened ID for display
 */
export function shortId(id: string, length = 8): string {
  return id.slice(0, length).toUpperCase()
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length = 50): string {
  if (text.length <= length) return text
  return text.slice(0, length) + "..."
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Validate phone number (Burkina Faso format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, "")
  
  // Should be 8 digits for Burkina Faso (or 10 with country code 226)
  return cleaned.length === 8 || (cleaned.length === 10 && cleaned.startsWith("226"))
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Get status badge color
 */
export function getStatusColor(
  status: string
): "success" | "warning" | "danger" | "info" {
  const statusColors: Record<string, "success" | "warning" | "danger" | "info"> = {
    // Mission statuses
    COMPLETED: "success",
    delivered: "success",
    ACCEPTED: "success",
    PENDING_PAYMENT: "warning",
    PENDING_ACCEPTANCE: "warning",
    IN_PROGRESS: "info",
    CANCELLED: "danger",
    DISPUTED: "danger",
    REFUNDED: "warning",
    
    // User statuses
    ACTIVE: "success",
    BLOCKED: "danger",
    SUSPENDED: "warning",
    
    // General
    pending: "warning",
    confirmed: "success",
    failed: "danger",
  }
  
  return statusColors[status] || "info"
}

/**
 * Delay execution (for demos/testing)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a random string
 */
export function generateRandomString(length = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
