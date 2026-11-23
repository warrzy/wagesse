export const REDACTED_CONTACT = "masqué"

type ContactUser = {
  phone?: string | null
  email?: string | null
  [key: string]: unknown
}

export function maskContactUser<T extends ContactUser>(user: T, hide: boolean): T {
  if (!hide) return user
  return {
    ...user,
    phone: user.phone == null ? user.phone : REDACTED_CONTACT,
    email: user.email == null ? user.email : REDACTED_CONTACT,
  }
}

export function lockedQuoteView(quote: {
  id: string
  status: string
  createdAt: Date | string
  requestId?: string
}) {
  return {
    id: quote.id,
    status: quote.status,
    createdAt: quote.createdAt,
    requestId: quote.requestId,
    locked: true as const,
  }
}
