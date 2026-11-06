import { maskEmail, maskPhoneNumber } from "@/lib/auth"

type ContactUser = {
  phone?: string | null
  email?: string | null
  [key: string]: unknown
}

export function maskContactUser<T extends ContactUser>(user: T, hide: boolean): T {
  if (!hide) return user
  return {
    ...user,
    phone: user.phone ? maskPhoneNumber(user.phone) : user.phone,
    email: user.email ? maskEmail(user.email) : user.email,
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
