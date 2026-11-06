import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function writeAudit(
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  changes: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: { userId, action, resource, resourceId, changes },
  })
}
