import { BaseService } from './base.service'

/**
 * LessonTopic service - handles all lesson topic-related business logic
 */
export class LessonTopicService extends BaseService {
  /**
   * Get all topics for a lesson
   */
  async getTopicsByLesson(lessonId: string, teacherId: string) {
    // Verify lesson ownership
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId }
    })

    if (!lesson || lesson.teacherId !== teacherId) {
      throw new Error('Unauthorized access to lesson')
    }

    return this.prisma.lessonTopic.findMany({
      where: { lessonId },
      orderBy: { lessonTopicOrder: 'asc' }
    })
  }

  /**
   * Get a single topic by ID
   */
  async getTopicById(topicId: string, teacherId: string) {
    const topic = await this.prisma.lessonTopic.findUnique({
      where: { id: topicId },
      include: { lesson: true }
    })

    // Verify ownership through lesson
    if (topic && topic.lesson.teacherId !== teacherId) {
      throw new Error('Unauthorized access to topic')
    }

    return topic
  }

  /**
   * Create a new topic
   */
  async createTopic(
    teacherId: string,
    data: {
      lessonTopicName: string
      lessonId: string
      lessonTopicOrder?: number
    }
  ) {
    // Verify lesson ownership
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: data.lessonId }
    })

    if (!lesson || lesson.teacherId !== teacherId) {
      throw new Error('Unauthorized access to lesson')
    }

    // Auto-calculate order if not provided
    let order = data.lessonTopicOrder
    if (order === undefined) {
      const lastTopic = await this.prisma.lessonTopic.findFirst({
        where: { lessonId: data.lessonId },
        orderBy: { lessonTopicOrder: 'desc' }
      })
      order = (lastTopic?.lessonTopicOrder ?? 0) + 1
    }

    return this.prisma.lessonTopic.create({
      data: {
        lessonTopicName: data.lessonTopicName,
        lessonId: data.lessonId,
        lessonTopicOrder: order
      }
    })
  }

  /**
   * Update a topic
   */
  async updateTopic(
    topicId: string,
    teacherId: string,
    data: {
      lessonTopicName?: string
      lessonTopicOrder?: number
    }
  ) {
    // Verify ownership
    await this.getTopicById(topicId, teacherId)

    const updateData: any = {}
    if (data.lessonTopicName !== undefined) updateData.lessonTopicName = data.lessonTopicName
    if (data.lessonTopicOrder !== undefined) updateData.lessonTopicOrder = data.lessonTopicOrder

    return this.prisma.lessonTopic.update({
      where: { id: topicId },
      data: updateData
    })
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topicId: string, teacherId: string) {
    // Verify ownership
    await this.getTopicById(topicId, teacherId)

    return this.prisma.lessonTopic.delete({
      where: { id: topicId }
    })
  }

  /**
   * Reorder topics for a lesson
   */
  async reorderTopics(
    lessonId: string,
    teacherId: string,
    topicIds: string[]
  ) {
    // Verify lesson ownership
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId }
    })

    if (!lesson || lesson.teacherId !== teacherId) {
      throw new Error('Unauthorized access to lesson')
    }

    // Update order for each topic
    return this.withTransaction(async (tx) => {
      const updates = topicIds.map((topicId, index) =>
        tx.lessonTopic.update({
          where: { id: topicId },
          data: { lessonTopicOrder: index + 1 }
        })
      )
      return Promise.all(updates)
    })
  }
}
