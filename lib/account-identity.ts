export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (!/^[0-9]{8,15}$/.test(digits)) return null
  return digits
}

export function classifyIdentifier(
  raw: string
): { kind: "email"; email: string } | { kind: "phone"; phone: string } | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 191) return null
  if (trimmed.includes("@")) {
    const email = normalizeEmail(trimmed)
    return email ? { kind: "email", email } : null
  }
  const phone = normalizePhone(trimmed)
  return phone ? { kind: "phone", phone } : null
}

/** Local and country-prefixed forms of one number. A lookup must refuse when they match different accounts. */
export function phoneLookupCandidates(phone: string): string[] {
  const values = new Set<string>([phone])
  if (phone.startsWith("226") && phone.length === 11) values.add(phone.slice(3))
  if (phone.length === 8) values.add(`226${phone}`)
  return [...values]
}
