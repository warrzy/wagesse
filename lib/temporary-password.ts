import { randomInt } from "crypto"

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const LOWER = "abcdefghijkmnopqrstuvwxyz"
const DIGITS = "23456789"
const ALL = UPPER + LOWER + DIGITS

export const TEMP_PASSWORD_TTL_MS = 30 * 60 * 1000
export const SUPER_ADMIN_RESET_PHRASE = "REINITIALISER-SUPER-ADMIN"

export function generateTemporaryPassword(): string {
  const chars = [
    UPPER[randomInt(UPPER.length)],
    LOWER[randomInt(LOWER.length)],
    DIGITS[randomInt(DIGITS.length)],
  ]
  while (chars.length < 16) chars.push(ALL[randomInt(ALL.length)])
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1)
    const current = chars[index]
    chars[index] = chars[swap]
    chars[swap] = current
  }
  return chars.join("")
}
