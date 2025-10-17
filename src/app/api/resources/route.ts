import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateRequest, createResourceSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const resources = await prisma.resource.findMany({
      where: {
        userId: user.id
      },
      include: {
        lessons: {
          include: {
            lesson: {
              include: {
                topics: true
              }
            },
            topics: {
              include: {
                topic: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return createSuccessResponse(resources)
  } catch (error) {
    return handleAPIError(error, 'Resources fetch')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const body = await request.json()

    // Transform the data structure to match the validation schema
    const validationData = {
      name: body.name,
      description: body.description,
      lessons: body.lessonIds?.map((lessonId: string) => ({
        lessonId,
        topics: body.topicIds
          ?.filter((topicId: string) => {
            // Filter topics that belong to this lesson
            // This will be checked more thoroughly during database operations
            return true // Accept all for now, will filter in transaction
          })
          .map((topicId: string) => ({
            topicId,
            questionCount: body.topicQuestionCounts?.[topicId]
          }))
      }))
    }

    // Validate request body
    const validation = validateRequest(createResourceSchema, validationData)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { name, description } = validation.data
    const { lessonIds, topicIds, topicQuestionCounts } = body

    const userId = user.id

    // Tüm işlemleri transaction içinde yap
    const result = await prisma.$transaction(async (tx) => {
      // Resource oluştur
      const resource = await tx.resource.create({
        data: {
          name,
          description: description || null,
          userId
        }
      })

      // Ders ilişkilerini oluştur
      if (lessonIds && lessonIds.length > 0) {
        for (const lessonId of lessonIds) {
          const resourceLesson = await tx.resourceLesson.create({
            data: {
              resourceId: resource.id,
              lessonId
            }
          })

          // Bu derse ait seçili konuları ekle
          if (topicIds && topicIds.length > 0) {
            // Bu derse ait konuları filtrele
            const lesson = await tx.lesson.findUnique({
              where: { id: lessonId },
              include: { topics: true }
            })

            if (lesson) {
              const lessonTopicIds = lesson.topics.map(topic => topic.id)
              const lessonTopics = topicIds.filter((topicId: string) => lessonTopicIds.includes(topicId))

              if (lessonTopics.length > 0) {
                await tx.resourceTopic.createMany({
                  data: lessonTopics.map((topicId: string) => ({
                    resourceId: resource.id,
                    topicId,
                    resourceLessonId: resourceLesson.id,
                    questionCount: (topicQuestionCounts && topicQuestionCounts[topicId]) || 0
                  }))
                })
              }
            }
          }
        }
      }

      return resource
    })

    // Resource'u derslerle birlikte döndür
    const resourceWithLessons = await prisma.resource.findUnique({
      where: { id: result.id },
      include: {
        lessons: {
          include: {
            lesson: {
              include: {
                topics: true
              }
            },
            topics: {
              include: {
                topic: true
              }
            }
          }
        }
      }
    })

    return createSuccessResponse(resourceWithLessons, 201)
  } catch (error) {
    return handleAPIError(error, 'Resource creation')
  }
}
