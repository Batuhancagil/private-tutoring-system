import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateResourceSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createNotFoundResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { transformResourceFromAPI, transformResourceToAPI, transformLessonToAPI, transformTopicToAPI } from '@/lib/transformers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { id } = await params

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        lessons: {
          include: {
            lesson: {
              include: {
                topics: true  // LessonTopic model
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

    if (!resource) {
      return createNotFoundResponse('Resource')
    }

    // Transform to API format
    const transformedResource = {
      ...transformResourceToAPI({
        id: resource.id,
        resourceName: resource.resourceName,
        resourceDescription: resource.resourceDescription,
        teacherId: resource.teacherId,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt
      }),
      lessons: resource.lessons.map((rl) => ({
        id: rl.id,
        lesson: {
          ...transformLessonToAPI({
            id: rl.lesson.id,
            name: rl.lesson.name,
            lessonGroup: rl.lesson.lessonGroup,
            lessonExamType: rl.lesson.lessonExamType,
            lessonSubject: rl.lesson.lessonSubject,
            color: rl.lesson.color,
            teacherId: rl.lesson.teacherId,
            createdAt: rl.lesson.createdAt,
            updatedAt: rl.lesson.updatedAt
          }),
          topics: rl.lesson.topics.map((topic) => transformTopicToAPI({
            id: topic.id,
            lessonTopicName: topic.lessonTopicName,
            lessonTopicOrder: topic.lessonTopicOrder,
            lessonId: topic.lessonId,
            lessonTopicAverageTestCount: topic.lessonTopicAverageTestCount,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt
          }))
        },
        topics: rl.topics.map((rt) => ({
          id: rt.id,
          topic: transformTopicToAPI({
            id: rt.topic.id,
            lessonTopicName: rt.topic.lessonTopicName,
            lessonTopicOrder: rt.topic.lessonTopicOrder,
            lessonId: rt.topic.lessonId,
            lessonTopicAverageTestCount: rt.topic.lessonTopicAverageTestCount,
            createdAt: rt.topic.createdAt,
            updatedAt: rt.topic.updatedAt
          }),
          questionCount: rt.resourceTopicQuestionCount
        }))
      }))
    }

    const successResponse = createSuccessResponse(transformedResource)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return handleAPIError(error, 'Resource fetch')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { id } = await params

    const body = await request.json()

    // Transform the data structure to match the validation schema
    const validationData = {
      name: body.name?.trim(),
      description: body.description && typeof body.description === 'string' && body.description.trim() !== ''
        ? body.description.trim()
        : undefined,
      lessons: body.lessonIds && Array.isArray(body.lessonIds) && body.lessonIds.length > 0
        ? body.lessonIds.map((lessonId: string) => ({
            lessonId,
            topics: body.topicIds && Array.isArray(body.topicIds) && body.topicIds.length > 0
              ? body.topicIds
                  .filter((topicId: string) => {
                    // Filter topics that belong to this lesson
                    // This will be checked more thoroughly during database operations
                    return true // Accept all for now, will filter in transaction
                  })
                  .map((topicId: string) => ({
                    topicId,
                    questionCount: body.topicQuestionCounts?.[topicId] !== undefined
                      ? Number(body.topicQuestionCounts[topicId]) || 0
                      : undefined
                  }))
              : []
          }))
        : undefined
    }

    // Validate request body
    const validation = validateRequest(updateResourceSchema, validationData)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { name, description } = validation.data
    const { lessonIds, topicIds, topicQuestionCounts } = body

    // Tüm işlemleri transaction içinde yap
    const result = await prisma.$transaction(async (tx) => {
      // Transform API data to DB format
      const dbData = transformResourceFromAPI({ name, description })

      // Resource'u güncelle
      const resource = await tx.resource.update({
        where: { id },
        data: dbData
      })

      // Mevcut ilişkileri sil
      await tx.resourceTopic.deleteMany({
        where: { resourceId: id }
      })
      await tx.resourceLesson.deleteMany({
        where: { resourceId: id }
      })

      // Yeni ders ilişkilerini oluştur
      if (lessonIds && lessonIds.length > 0) {
        for (const lessonId of lessonIds) {
          const resourceLesson = await tx.resourceLesson.create({
            data: {
              resourceId: id,
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
                    resourceId: id,
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

    // Güncellenmiş resource'u döndür
    const updatedResource = await prisma.resource.findUnique({
      where: { id },
      include: {
        lessons: {
          include: {
            lesson: {
              include: {
                topics: true  // LessonTopic model
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

    if (!updatedResource) {
      throw new Error('Resource not found after update')
    }

    // Transform to API format
    const transformedResource = {
      ...transformResourceToAPI({
        id: updatedResource.id,
        resourceName: updatedResource.resourceName,
        resourceDescription: updatedResource.resourceDescription,
        teacherId: updatedResource.teacherId,
        createdAt: updatedResource.createdAt,
        updatedAt: updatedResource.updatedAt
      }),
      lessons: updatedResource.lessons.map((rl) => ({
        id: rl.id,
        lesson: {
          ...transformLessonToAPI({
            id: rl.lesson.id,
            name: rl.lesson.name,
            lessonGroup: rl.lesson.lessonGroup,
            lessonExamType: rl.lesson.lessonExamType,
            lessonSubject: rl.lesson.lessonSubject,
            color: rl.lesson.color,
            teacherId: rl.lesson.teacherId,
            createdAt: rl.lesson.createdAt,
            updatedAt: rl.lesson.updatedAt
          }),
          topics: rl.lesson.topics.map((topic) => transformTopicToAPI({
            id: topic.id,
            lessonTopicName: topic.lessonTopicName,
            lessonTopicOrder: topic.lessonTopicOrder,
            lessonId: topic.lessonId,
            lessonTopicAverageTestCount: topic.lessonTopicAverageTestCount,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt
          }))
        },
        topics: rl.topics.map((rt) => ({
          id: rt.id,
          topic: transformTopicToAPI({
            id: rt.topic.id,
            lessonTopicName: rt.topic.lessonTopicName,
            lessonTopicOrder: rt.topic.lessonTopicOrder,
            lessonId: rt.topic.lessonId,
            lessonTopicAverageTestCount: rt.topic.lessonTopicAverageTestCount,
            createdAt: rt.topic.createdAt,
            updatedAt: rt.topic.updatedAt
          }),
          questionCount: rt.resourceTopicQuestionCount
        }))
      }))
    }

    const successResponse = createSuccessResponse(transformedResource)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Resource update')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { id} = await params

    // Önce ders ilişkilerini sil
    await prisma.resourceLesson.deleteMany({
      where: { resourceId: id }
    })

    // Sonra resource'u sil
    await prisma.resource.delete({
      where: { id }
    })

    const successResponse = createSuccessResponse({ success: true })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Resource deletion')
  }
}
