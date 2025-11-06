import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateRequest, createResourceSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { transformResourceToAPI, transformResourceFromAPI, type ResourceDB } from '@/lib/transformers'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Get total count
    const totalCount = await prisma.resource.count({
      where: { teacherId: user.id }
    })

    // Get paginated data
    const resources = await prisma.resource.findMany({
      where: {
        teacherId: user.id
      },
      skip,
      take: limit,
      include: {
        lessons: {
          include: {
            lesson: {
              include: {
                topics: true  // This refers to LessonTopic model
              }
            },
            topics: {
              include: {
                topic: true  // ResourceTopic.topic points to LessonTopic
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Note: Resources have complex nested structures with lessons/topics
    // For now, we'll keep the response as-is since transforming nested data
    // would require more complex transformation logic
    // TODO: Add nested transformers for complex responses

    const successResponse = createSuccessResponse({
      data: resources,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return handleAPIError(error, 'Resources fetch')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const body = await request.json()

    // Transform the data structure to match the validation schema
    const validationData = {
      name: body.name,
      description: body.description,
      lessons: body.lessonIds && body.lessonIds.length > 0
        ? body.lessonIds.map((lessonId: string) => ({
            lessonId,
            topics: body.topicIds && body.topicIds.length > 0
              ? body.topicIds
                  .filter((topicId: string) => {
                    // Filter topics that belong to this lesson
                    // This will be checked more thoroughly during database operations
                    return true // Accept all for now, will filter in transaction
                  })
                  .map((topicId: string) => ({
                    topicId,
                    questionCount: body.topicQuestionCounts?.[topicId]
                  }))
              : []
          }))
        : undefined
    }

    // Validate request body
    const validation = validateRequest(createResourceSchema, validationData)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { name, description } = validation.data
    const { lessonIds, topicIds, topicQuestionCounts } = body

    const teacherId = user.id

    // Tüm işlemleri transaction içinde yap
    const result = await prisma.$transaction(async (tx) => {
      // Resource oluştur
      const resource = await tx.resource.create({
        data: {
          resourceName: name,
          resourceDescription: description || null,
          teacherId
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
                    resourceTopicQuestionCount: (topicQuestionCounts && topicQuestionCounts[topicId]) || 0  // questionCount → resourceTopicQuestionCount
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
                topics: true  // This refers to LessonTopic model
              }
            },
            topics: {
              include: {
                topic: true  // ResourceTopic.topic points to LessonTopic
              }
            }
          }
        }
      }
    })

    const successResponse = createSuccessResponse(resourceWithLessons, 201)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Resource creation')
  }
}
