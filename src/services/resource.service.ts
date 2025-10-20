import { BaseService } from './base.service'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

/**
 * Resource service - handles all resource-related business logic
 */
export class ResourceService extends BaseService {
  /**
   * Get all resources for a teacher with pagination
   */
  async getResourcesByTeacher(
    teacherId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const { skip, take } = this.getPaginationParams(page, limit)

    const [resources, totalCount] = await Promise.all([
      this.prisma.resource.findMany({
        where: { teacherId },
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.resource.count({
        where: { teacherId }
      })
    ])

    return {
      resources,
      pagination: this.getPaginationMeta(page, limit, totalCount)
    }
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(resourceId: string, teacherId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId }
    })

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    // Verify ownership
    if (resource.teacherId !== teacherId) {
      throw new UnauthorizedError('Unauthorized access to resource')
    }

    return resource
  }

  /**
   * Create a new resource
   */
  async createResource(
    teacherId: string,
    data: {
      resourceName: string
      resourceDescription?: string
    }
  ) {
    return this.prisma.resource.create({
      data: {
        resourceName: data.resourceName,
        resourceDescription: data.resourceDescription || null,
        teacherId
      }
    })
  }

  /**
   * Update a resource
   */
  async updateResource(
    resourceId: string,
    teacherId: string,
    data: {
      resourceName?: string
      resourceDescription?: string
    }
  ) {
    // Verify ownership
    await this.getResourceById(resourceId, teacherId)

    const updateData: {
      resourceName?: string
      resourceDescription?: string | null
    } = {}
    if (data.resourceName !== undefined) updateData.resourceName = data.resourceName
    if (data.resourceDescription !== undefined) {
      updateData.resourceDescription = data.resourceDescription || null
    }

    return this.prisma.resource.update({
      where: { id: resourceId },
      data: updateData
    })
  }

  /**
   * Delete a resource
   */
  async deleteResource(resourceId: string, teacherId: string) {
    // Verify ownership
    await this.getResourceById(resourceId, teacherId)

    return this.prisma.resource.delete({
      where: { id: resourceId }
    })
  }

  /**
   * Get resource with all details (lessons, topics)
   */
  async getResourceWithDetails(resourceId: string, teacherId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        lessons: {
          include: {
            lesson: true,
            topics: {
              include: {
                topic: true
              }
            }
          }
        }
      }
    })

    if (!resource) {
      throw new NotFoundError('Resource not found')
    }

    // Verify ownership
    if (resource.teacherId !== teacherId) {
      throw new UnauthorizedError('Unauthorized access to resource')
    }

    return resource
  }
}
