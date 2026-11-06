import { NotificationType } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export function clipText(value: string, max = 191) {
  const text = value.replace(/\s+/g, " ").trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

export async function notifyUser(
  userId: string,
  input: { type?: NotificationType; title: string; message: string; actionUrl?: string }
) {
  await prisma.notification.create({
    data: {
      userId,
      type: input.type || "SYSTEM_ALERT",
      title: clipText(input.title),
      message: clipText(input.message),
      actionUrl: input.actionUrl,
      read: false,
    },
  })
}

export async function notifyAdmins(title: string, message: string, actionUrl?: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
    select: { id: true },
  })
  if (admins.length === 0) return
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: "SYSTEM_ALERT" as const,
      title: clipText(title),
      message: clipText(message),
      actionUrl,
      read: false,
    })),
  })
}
