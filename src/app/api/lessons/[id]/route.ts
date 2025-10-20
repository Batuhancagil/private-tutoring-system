import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateLessonSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { transformLessonToAPI, transformLessonFromAPI, type LessonDB } from '@/lib/transformers'

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

    // Validate request body
    const validation = validateRequest(updateLessonSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    // Transform API data to DB format
    const updateData = transformLessonFromAPI(validation.data)

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData
    })

    // Transform DB data back to API format
    const apiLesson = transformLessonToAPI(lesson as LessonDB)

    const successResponse = createSuccessResponse(apiLesson)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Lesson update')
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

    const { id } = await params

    // Önce konuları sil (cascade delete)
    await prisma.lessonTopic.deleteMany({  // topic → lessonTopic
      where: { lessonId: id }
    })

    // Sonra dersi sil
    await prisma.lesson.delete({
      where: { id }
    })

    const successResponse = createSuccessResponse({ success: true })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Lesson deletion')
  }
}
