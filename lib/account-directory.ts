import { prisma } from "@/lib/prisma"
import { classifyIdentifier, phoneLookupCandidates } from "@/lib/account-identity"

export async function findAccountsByIdentifier(raw: string) {
  const id = classifyIdentifier(raw)
  if (!id) return { status: "invalid" as const }
  if (id.kind === "email") {
    const users = await prisma.user.findMany({ where: { email: id.email } })
    if (users.length > 1) return { status: "collision" as const }
    return { status: "ok" as const, user: users[0] ?? null, key: id.email }
  }
  const users = await prisma.user.findMany({
    where: { phone: { in: phoneLookupCandidates(id.phone) } },
  })
  if (users.length > 1) return { status: "collision" as const }
  return { status: "ok" as const, user: users[0] ?? null, key: id.phone }
}
