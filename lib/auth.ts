import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key_change_in_production"
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "7d"

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generate JWT token
export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  )
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: string
    }
    return decoded
  } catch (error) {
    console.error("Token verification failed:", error)
    return null
  }
}

// Generate OTP for phone verification
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generate unique reference
export function generateReference(prefix: string): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}${random}`
}

// Mask sensitive data in logs
export function maskPhoneNumber(phone: string): string {
  if (phone.length < 4) return "****"
  return `***${phone.slice(-4)}`
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@")
  if (!name || !domain) return "****@****"
  return `${name.charAt(0)}***@${domain}`
}

// OTP Storage (in-memory, should use Redis in production)
const otpStore: Map<string, { code: string; expiresAt: number }> = new Map()

export function storeOTP(identifier: string, code: string, expiryMinutes = 10): void {
  otpStore.set(identifier, {
    code,
    expiresAt: Date.now() + expiryMinutes * 60 * 1000,
  })
}

export function verifyOTP(identifier: string, code: string): boolean {
  const stored = otpStore.get(identifier)
  if (!stored || stored.expiresAt < Date.now()) {
    otpStore.delete(identifier)
    return false
  }
  
  const isValid = stored.code === code
  if (isValid) {
    otpStore.delete(identifier) // OTP can only be used once
  }
  return isValid
}

export function clearOTP(identifier: string): void {
  otpStore.delete(identifier)
}
