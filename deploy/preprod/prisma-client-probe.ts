import type {
  Prisma,
  PrismaClient,
  Role,
  QuoteStatus,
  MissionStatus,
  RequestStatus,
  NotificationType,
  Payment,
  PaymentStatus,
} from "@prisma/client"

/**
 * Fails while the postinstall stub is installed. The generated client exports
 * namespace Prisma, including the schema members used by the application.
 * This file does not open a database connection and does not print a query.
 */
export type GeneratedPrismaClient = {
  namespace: Prisma.SubscriptionPlanSelect
  creditPackWhere: Prisma.CreditPackWhereInput
  creditPackOrder: Prisma.CreditPackOrderByWithRelationInput
  json: Prisma.InputJsonValue
  commercialOrderWhere: Prisma.CommercialOrderWhereInput
  transaction: Prisma.TransactionClient
  client: PrismaClient
  role: Role
  quoteStatus: QuoteStatus
  missionStatus: MissionStatus
  requestStatus: RequestStatus
  notificationType: NotificationType
  payment: Payment
  paymentStatus: PaymentStatus
}
