import { BaseService } from './base.service'

/**
 * Lesson service - handles all lesson-related business logic
 */
export class LessonService extends BaseService {
  /**
   * Get all lessons for a user with pagination
   */
  async getLessonsByUser(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const { skip, take } = this.getPaginationParams(page, limit)

    const [lessons, totalCount] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { userId },
        include: {
          topics: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.lesson.count({
        where: { userId }
      })
    ])

    return {
      lessons,
      pagination: this.getPaginationMeta(page, limit, totalCount)
    }
  }

  /**
   * Get a single lesson by ID
   */
  async getLessonById(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topics: {
          orderBy: { order: 'asc' }
        }
      }
    })

    // Verify ownership
    if (lesson && lesson.userId !== userId) {
      throw new Error('Unauthorized access to lesson')
    }

    return lesson
  }

  /**
   * Create a new lesson with auto-assigned color
   */
  async createLesson(
    userId: string,
    data: {
      name: string
      group: string
      type?: string
      subject?: string
      color?: string
    }
  ) {
    const availableColors: Array<
      'blue' | 'purple' | 'green' | 'emerald' | 'orange' | 'red' | 'gray'
    > = ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'gray']

    // Auto-assign color if not provided
    let assignedColor: typeof availableColors[number] = data.color as any || 'blue'

    if (!data.color) {
      const existingLessons = await this.prisma.lesson.findMany({
        where: { userId },
        select: { color: true }
      })

      const usedColors = new Set(existingLessons.map(l => l.color))
      const foundColor = availableColors.find(c => !usedColors.has(c))
      assignedColor = foundColor !== undefined ? foundColor : 'blue'
    }

    return this.prisma.lesson.create({
      data: {
        name: data.name,
        group: data.group,
        type: data.type || 'TYT',
        subject: data.subject || null,
        color: assignedColor,
        userId
      }
    })
  }

  /**
   * Update a lesson
   */
  async updateLesson(
    lessonId: string,
    userId: string,
    data: {
      name?: string
      group?: string
      type?: string
      subject?: string
      color?: string
    }
  ) {
    // Verify ownership
    await this.getLessonById(lessonId, userId)

    // Build update data
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.group !== undefined) updateData.group = data.group
    if (data.type !== undefined) updateData.type = data.type
    if (data.subject !== undefined) updateData.subject = data.subject || null
    if (data.color !== undefined) updateData.color = data.color

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: updateData
    })
  }

  /**
   * Delete a lesson and its topics
   */
  async deleteLesson(lessonId: string, userId: string) {
    // Verify ownership
    await this.getLessonById(lessonId, userId)

    return this.withTransaction(async (tx) => {
      // Delete topics first (cascade should handle this, but explicit is better)
      await tx.topic.deleteMany({
        where: { lessonId }
      })

      // Delete the lesson
      return tx.lesson.delete({
        where: { id: lessonId }
      })
    })
  }

  /**
   * Get lessons by type (TYT/AYT)
   */
  async getLessonsByType(
    userId: string,
    type: string,
    page: number = 1,
    limit: number = 20
  ) {
    const { skip, take } = this.getPaginationParams(page, limit)

    const [lessons, totalCount] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { userId, type },
        include: {
          topics: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.lesson.count({
        where: { userId, type }
      })
    ])

    return {
      lessons,
      pagination: this.getPaginationMeta(page, limit, totalCount)
    }
  }
}
