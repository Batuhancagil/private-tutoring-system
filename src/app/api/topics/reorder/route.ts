import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import {
  handleAPIError,
  createSuccessResponse,
  createValidationErrorResponse,
  createErrorResponse,
  createForbiddenResponse,
} from '@/lib/error-handler'

export async function PUT(request: NextRequest) {
  try {
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const body = await request.json()
    const lessonId = body?.lessonId as string | undefined
    const topicIds = Array.isArray(body?.topicIds) ? (body.topicIds as string[]) : undefined

    if (!lessonId || !topicIds || topicIds.some((id) => typeof id !== 'string')) {
      return createValidationErrorResponse({
        lessonId: lessonId ? undefined : 'Lesson ID is required',
        topicIds: topicIds ? undefined : 'topicIds must be an array of strings',
      })
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { teacherId: true },
    })

    if (!lesson) {
      return createErrorResponse('Lesson not found', 404)
    }

    if (user.role !== 'SUPER_ADMIN' && lesson.teacherId !== user.id) {
      return createForbiddenResponse('Bu derse erişim izniniz yok')
    }

    const topicsBelongCount = await prisma.lessonTopic.count({
      where: {
        lessonId,
        id: { in: topicIds },
      },
    })

    if (topicsBelongCount !== topicIds.length) {
      return createValidationErrorResponse({
        topicIds: 'All topicIds must belong to the specified lesson',
      })
    }

    await prisma.$transaction(
      topicIds.map((topicId, index) =>
        prisma.lessonTopic.updateMany({
          where: {
            id: topicId,
            lessonId,
          },
          data: {
            lessonTopicOrder: index + 1,
          },
        })
      )
    )

    const successResponse = createSuccessResponse({ success: true })
    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Topic reorder')
  }
}

