import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Railway'de DATABASE_URL environment variable'ı için fallback
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:lzFFvoaoVcjhrfacGoDQsBeTGWwMMTck@crossover.proxy.rlwy.net:29359/railway'

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
