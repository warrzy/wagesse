import { PrismaClient } from '@prisma/client';

// Create a single instance of Prisma Client to be reused
// This prevents creating multiple instances in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
