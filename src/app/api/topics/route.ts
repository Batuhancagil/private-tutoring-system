import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createTopicSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createErrorResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { transformTopicToAPI, transformTopicFromAPI, transformTopicsToAPI, type LessonTopicDB } from '@/lib/transformers'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return createErrorResponse('Lesson ID is required', 400)
    }

    const topics = await prisma.lessonTopic.findMany({
      where: { lessonId },
      orderBy: { lessonTopicOrder: 'asc' }
    })

    // Transform DB data to API format
    const apiTopics = transformTopicsToAPI(topics as LessonTopicDB[])

    const topicsWithQuestionCount = apiTopics.map(topic => ({
      ...topic,
      questionCount: 0
    }))

    const successResponse = createSuccessResponse(topicsWithQuestionCount)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return handleAPIError(error, 'Topics fetch')
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

    // If order is not provided, calculate it automatically
    if (!body.order) {
      const existingTopicsCount = await prisma.lessonTopic.count({
        where: { lessonId: body.lessonId }
      })
      body.order = existingTopicsCount + 1
    }

    // Validate request body
    const validation = validateRequest(createTopicSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    // Transform API data to DB format
    const dbData = transformTopicFromAPI(validation.data)

    const topic = await prisma.lessonTopic.create({
      data: {
        ...dbData,
        lessonId: validation.data.lessonId
      }
    })

    // Transform DB data back to API format
    const apiTopic = transformTopicToAPI(topic as LessonTopicDB)

    const successResponse = createSuccessResponse(apiTopic, 201)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Topic creation')
  }
}
