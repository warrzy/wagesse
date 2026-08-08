type SanitizeResult = { value: string; modified: boolean }

function redactEmails(input: string): SanitizeResult {
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
  let modified = false
  const value = input.replace(re, () => {
    modified = true
    return "[email masqué]"
  })
  return { value, modified }
}

function redactUrls(input: string): SanitizeResult {
  const re = /(https?:\/\/\S+|www\.\S+)/gi
  let modified = false
  const value = input.replace(re, () => {
    modified = true
    return "[lien masqué]"
  })
  return { value, modified }
}

function redactPhones(input: string): SanitizeResult {
  const re = /(\+?\d[\d\s().-]{6,}\d)/g
  let modified = false
  const value = input.replace(re, (match) => {
    const digits = match.replace(/\D/g, "")
    if (digits.length >= 8) {
      modified = true
      return "[numéro masqué]"
    }
    return match
  })
  return { value, modified }
}

export function sanitizeNoContactLeak(input: string): { value: string; modified: boolean } {
  let out = input
  let modified = false

  const e = redactEmails(out)
  out = e.value
  modified = modified || e.modified

  const u = redactUrls(out)
  out = u.value
  modified = modified || u.modified

  const p = redactPhones(out)
  out = p.value
  modified = modified || p.modified

  return { value: out, modified }
}

export function sanitizeOptionalString(input: string | null | undefined): string | undefined {
  if (input === null || input === undefined) return undefined
  const trimmed = String(input)
  if (!trimmed) return trimmed
  return sanitizeNoContactLeak(trimmed).value
}
