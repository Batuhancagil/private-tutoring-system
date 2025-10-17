import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Base service class with common database operations
 * All domain services should extend this class
 */
export abstract class BaseService {
  protected prisma = prisma

  /**
   * Get Prisma transaction client
   * Use this for operations that need to be atomic
   */
  protected async withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(callback)
  }

  /**
   * Standard pagination helper
   */
  protected getPaginationParams(page: number = 1, limit: number = 20) {
    const normalizedLimit = Math.min(Math.max(1, limit), 100)
    const normalizedPage = Math.max(1, page)
    const skip = (normalizedPage - 1) * normalizedLimit

    return {
      skip,
      take: normalizedLimit,
      page: normalizedPage,
      limit: normalizedLimit
    }
  }

  /**
   * Calculate pagination metadata
   */
  protected getPaginationMeta(page: number, limit: number, totalCount: number) {
    return {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  }

  /**
   * Build where clause for soft delete
   */
  protected withSoftDelete<T extends { isActive?: boolean }>(
    where: T,
    includeDeleted: boolean = false
  ): T {
    if (!includeDeleted && 'isActive' in where) {
      return { ...where, isActive: true } as T
    }
    return where
  }
}
