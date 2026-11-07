import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import { createHash, timingSafeEqual } from "crypto"

const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "7d"

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET manquant")
  }
  return "development_only_jwt_secret"
}

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
    jwtSecret(),
    { expiresIn: JWT_EXPIRATION, algorithm: "HS256" }
  )
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, jwtSecret(), { algorithms: ["HS256"] }) as {
      userId: string
      email: string
      role: string
    }
    return decoded
  } catch {
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

type OtpRecord = {
  hash: string
  expiresAt: number
  attempts: number
  lockedUntil: number
}

type OtpSendWindow = {
  lastSentAt: number
  hourStart: number
  hourCount: number
}

const OTP_MAX_ATTEMPTS = 5
const OTP_LOCK_MS = 15 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const OTP_MAX_SENDS_PER_HOUR = 5

const otpStore: Map<string, OtpRecord> = new Map()
const otpSendWindows: Map<string, OtpSendWindow> = new Map()

function hashOtp(identifier: string, code: string): string {
  const secret = process.env.JWT_SECRET || ""
  return createHash("sha256").update(`${identifier}:${code}:${secret}`).digest("hex")
}

function hashesMatch(storedHex: string, candidateHex: string): boolean {
  const stored = Buffer.from(storedHex, "utf8")
  const candidate = Buffer.from(candidateHex, "utf8")
  if (stored.length !== candidate.length) return false
  return timingSafeEqual(stored, candidate)
}

export function storeOTP(identifier: string, code: string, expiryMinutes = 10): void {
  otpStore.set(identifier, {
    hash: hashOtp(identifier, code),
    expiresAt: Date.now() + expiryMinutes * 60 * 1000,
    attempts: 0,
    lockedUntil: 0,
  })
}

export type OtpCheck =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "locked" }

export function verifyOTP(identifier: string, code: string): OtpCheck {
  const stored = otpStore.get(identifier)
  if (!stored) return { ok: false, reason: "expired" }
  if (stored.lockedUntil > Date.now()) return { ok: false, reason: "locked" }
  if (stored.expiresAt < Date.now() || !stored.hash) {
    otpStore.delete(identifier)
    return { ok: false, reason: "expired" }
  }

  const valid = hashesMatch(stored.hash, hashOtp(identifier, code))
  if (!valid) {
    stored.attempts += 1
    if (stored.attempts >= OTP_MAX_ATTEMPTS) {
      stored.lockedUntil = Date.now() + OTP_LOCK_MS
      stored.hash = ""
      return { ok: false, reason: "locked" }
    }
    return { ok: false, reason: "invalid" }
  }

  otpStore.delete(identifier)
  return { ok: true }
}

export function clearOTP(identifier: string): void {
  otpStore.delete(identifier)
}

export function assertOtpSendAllowed(identifier: string): { ok: true } | { ok: false; reason: "cooldown" | "hourly" } {
  const now = Date.now()
  const window = otpSendWindows.get(identifier)
  if (!window || now - window.hourStart >= 60 * 60 * 1000) {
    return { ok: true }
  }
  if (now - window.lastSentAt < OTP_RESEND_COOLDOWN_MS) return { ok: false, reason: "cooldown" }
  if (window.hourCount >= OTP_MAX_SENDS_PER_HOUR) return { ok: false, reason: "hourly" }
  return { ok: true }
}

export function recordOtpSend(identifier: string): void {
  const now = Date.now()
  const window = otpSendWindows.get(identifier)
  if (!window || now - window.hourStart >= 60 * 60 * 1000) {
    otpSendWindows.set(identifier, { lastSentAt: now, hourStart: now, hourCount: 1 })
    return
  }
  window.lastSentAt = now
  window.hourCount += 1
}

/** Code renvoyé uniquement hors production, et seulement si le drapeau de test est posé. */
export function exposeOtpForTests(code: string): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined
  if (process.env.OTP_DEBUG_RETURN !== "true") return undefined
  return code
}
