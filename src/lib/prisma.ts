import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Note: DATABASE_URL validation is deferred to Prisma Client initialization
// to avoid build-time errors in CI/CD pipelines where env vars
// are only available at runtime (e.g., Railway, Vercel)
// Prisma will throw a clear error if DATABASE_URL is missing at runtime

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
