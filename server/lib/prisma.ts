import { PrismaClient } from "../generated/prisma/index.js";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const INTERACTIVE_TRANSACTION_TIMEOUT_MS = 30_000;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    transactionOptions: {
      maxWait: 10_000,
      timeout: INTERACTIVE_TRANSACTION_TIMEOUT_MS,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
