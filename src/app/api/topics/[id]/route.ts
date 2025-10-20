import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateTopicSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { transformTopicToAPI, transformTopicFromAPI, type LessonTopicDB } from '@/lib/transformers'

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

    const { id } = await params
    const body = await request.json()

    // Handle questionCount separately (not part of updateTopicSchema)
    if (body.questionCount !== undefined && Object.keys(body).length === 1) {
      // Geçici olarak sadece response döndür, database güncellemesi yapma
      const successResponse = createSuccessResponse({
        id,
        questionCount: parseInt(body.questionCount) || 0,
        message: 'Question count updated (temporary - database not updated)'
      })
      return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
    }

    // Validate request body
    const validation = validateRequest(updateTopicSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    // Transform API data to DB format
    const updateData = transformTopicFromAPI(validation.data)

    const topic = await prisma.lessonTopic.update({
      where: { id },
      data: updateData
    })

    // Transform DB data back to API format
    const apiTopic = transformTopicToAPI(topic as LessonTopicDB)

    const successResponse = createSuccessResponse(apiTopic)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Topic update')
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

    const { id } = await params

    await prisma.lessonTopic.delete({
      where: { id }
    })

    const successResponse = createSuccessResponse({ success: true })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Topic deletion')
  }
}
