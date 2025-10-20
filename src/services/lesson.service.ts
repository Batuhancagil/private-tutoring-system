import { BaseService } from './base.service'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

/**
 * Lesson service - handles all lesson-related business logic
 */
export class LessonService extends BaseService {
  /**
   * Get all lessons for a teacher with pagination
   * @param teacherId - Teacher's user ID (userId → teacherId)
   */
  async getLessonsByTeacher(
    teacherId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const { skip, take } = this.getPaginationParams(page, limit)

    const [lessons, totalCount] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { teacherId },
        include: {
          topics: {
            orderBy: { lessonTopicOrder: 'asc' }  // order → lessonTopicOrder
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.lesson.count({
        where: { teacherId }
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
  async getLessonById(lessonId: string, teacherId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topics: {
          orderBy: { lessonTopicOrder: 'asc' }  // order → lessonTopicOrder
        }
      }
    })

    if (!lesson) {
      throw new NotFoundError('Lesson not found')
    }

    // Verify ownership
    if (lesson.teacherId !== teacherId) {
      throw new UnauthorizedError('Unauthorized access to lesson')
    }

    return lesson
  }

  /**
   * Create a new lesson with auto-assigned color
   */
  async createLesson(
    teacherId: string,
    data: {
      name: string
      lessonGroup: string        // group → lessonGroup
      lessonExamType?: string    // type → lessonExamType
      lessonSubject?: string     // subject → lessonSubject
      color?: string
    }
  ) {
    const availableColors: Array<
      'blue' | 'purple' | 'green' | 'emerald' | 'orange' | 'red' | 'gray'
    > = ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'gray']

    // Auto-assign color if not provided
    let assignedColor: typeof availableColors[number] = (data.color as typeof availableColors[number]) || 'blue'

    if (!data.color) {
      const existingLessons = await this.prisma.lesson.findMany({
        where: { teacherId },
        select: { color: true }
      })

      const usedColors = new Set(existingLessons.map(l => l.color))
      const foundColor = availableColors.find(c => !usedColors.has(c))
      assignedColor = foundColor !== undefined ? foundColor : 'blue'
    }

    return this.prisma.lesson.create({
      data: {
        name: data.name,
        lessonGroup: data.lessonGroup,
        lessonExamType: data.lessonExamType || 'TYT',
        lessonSubject: data.lessonSubject || null,
        color: assignedColor,
        teacherId
      }
    })
  }

  /**
   * Update a lesson
   */
  async updateLesson(
    lessonId: string,
    teacherId: string,
    data: {
      name?: string
      lessonGroup?: string
      lessonExamType?: string
      lessonSubject?: string
      color?: string
    }
  ) {
    // Verify ownership
    await this.getLessonById(lessonId, teacherId)

    // Build update data
    const updateData: {
      name?: string
      lessonGroup?: string
      lessonExamType?: string
      lessonSubject?: string | null
      color?: string
    } = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.lessonGroup !== undefined) updateData.lessonGroup = data.lessonGroup
    if (data.lessonExamType !== undefined) updateData.lessonExamType = data.lessonExamType
    if (data.lessonSubject !== undefined) updateData.lessonSubject = data.lessonSubject || null
    if (data.color !== undefined) updateData.color = data.color

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: updateData
    })
  }

  /**
   * Delete a lesson and its topics
   */
  async deleteLesson(lessonId: string, teacherId: string) {
    // Verify ownership
    await this.getLessonById(lessonId, teacherId)

    return this.withTransaction(async (tx) => {
      // Delete topics first (cascade should handle this, but explicit is better)
      await tx.lessonTopic.deleteMany({  // topic → lessonTopic
        where: { lessonId }
      })

      // Delete the lesson
      return tx.lesson.delete({
        where: { id: lessonId }
      })
    })
  }

  /**
   * Get lessons by exam type (TYT/AYT)
   */
  async getLessonsByExamType(
    teacherId: string,
    examType: string,
    page: number = 1,
    limit: number = 20
  ) {
    const { skip, take } = this.getPaginationParams(page, limit)

    const [lessons, totalCount] = await Promise.all([
      this.prisma.lesson.findMany({
        where: {
          teacherId,
          lessonExamType: examType  // type → lessonExamType
        },
        include: {
          topics: {
            orderBy: { lessonTopicOrder: 'asc' }  // order → lessonTopicOrder
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      this.prisma.lesson.count({
        where: {
          teacherId,
          lessonExamType: examType
        }
      })
    ])

    return {
      lessons,
      pagination: this.getPaginationMeta(page, limit, totalCount)
    }
  }

  /**
   * Get all unique exam types for a teacher
   */
  async getExamTypes(teacherId: string): Promise<string[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { teacherId },
      select: { lessonExamType: true },
      distinct: ['lessonExamType']
    })

    return lessons.map(l => l.lessonExamType)
  }

  /**
   * Get all unique lesson groups for a teacher (for autocomplete)
   */
  async getLessonGroups(teacherId: string): Promise<string[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { teacherId },
      select: { lessonGroup: true },
      distinct: ['lessonGroup']
    })

    return lessons.map(l => l.lessonGroup)
  }

  /**
   * Get all unique lesson subjects for a teacher (for autocomplete)
   */
  async getLessonSubjects(teacherId: string): Promise<string[]> {
    const lessons = await this.prisma.lesson.findMany({
      where: { teacherId, lessonSubject: { not: null } },
      select: { lessonSubject: true },
      distinct: ['lessonSubject']
    })

    return lessons
      .map(l => l.lessonSubject)
      .filter((s): s is string => s !== null)
  }
}
