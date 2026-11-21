import { prisma } from "@/lib/prisma"
import {
  DEFAULT_QUOTE_CREDIT_COST,
  QUOTE_CREDIT_COST_KEY,
  parseQuoteCreditCost,
} from "@/lib/commercial-rules"

type SettingReader = {
  platformSetting: {
    findUnique: (args: { where: { key: string } }) => Promise<{ value: unknown } | null>
  }
}

export async function readQuoteCreditCost(db: SettingReader = prisma): Promise<number> {
  const setting = await db.platformSetting.findUnique({ where: { key: QUOTE_CREDIT_COST_KEY } })
  return parseQuoteCreditCost(setting?.value) ?? DEFAULT_QUOTE_CREDIT_COST
}

export async function writeQuoteCreditCost(credits: number, actorId: string) {
  const parsed = parseQuoteCreditCost(credits)
  if (parsed === null) throw new Error("INVALID_QUOTE_COST")
  await prisma.platformSetting.upsert({
    where: { key: QUOTE_CREDIT_COST_KEY },
    update: {
      value: parsed,
      type: "number",
      description: "Crédits débités lorsqu'un transporteur envoie un devis",
      updatedBy: actorId,
    },
    create: {
      key: QUOTE_CREDIT_COST_KEY,
      value: parsed,
      type: "number",
      description: "Crédits débités lorsqu'un transporteur envoie un devis",
      updatedBy: actorId,
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: "set_quote_credit_cost",
      resource: "PlatformSetting",
      resourceId: QUOTE_CREDIT_COST_KEY,
      changes: { credits: parsed },
    },
  })
  return parsed
}
