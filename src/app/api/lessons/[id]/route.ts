import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateLessonSchema } from '@/lib/validations'
import {
  handleAPIError,
  createValidationErrorResponse,
  createSuccessResponse,
  createErrorResponse,
  createForbiddenResponse,
} from '@/lib/error-handler'
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

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      select: {
        teacherId: true,
      },
    })

    if (!existingLesson) {
      return createErrorResponse('Lesson not found', 404)
    }

    if (user.role !== 'SUPER_ADMIN' && existingLesson.teacherId !== user.id) {
      return createForbiddenResponse('Bu dersi düzenleme yetkiniz yok')
    }

    // Validate request body
    const validation = validateRequest(updateLessonSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    // Transform API data to DB format
    const updateData = transformLessonFromAPI(validation.data)

    await prisma.lesson.update({
      where: { id },
      data: updateData,
    })

    const lessonWithTeacher = await prisma.lesson.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!lessonWithTeacher) {
      return createErrorResponse('Lesson not found', 404)
    }

    const apiLesson = transformLessonToAPI(lessonWithTeacher as unknown as LessonDB)
    const enhancedLesson = {
      ...apiLesson,
      teacherName: user.role === 'SUPER_ADMIN' ? lessonWithTeacher.teacher?.name ?? null : null,
      teacherEmail: user.role === 'SUPER_ADMIN' ? lessonWithTeacher.teacher?.email ?? null : null,
    }

    const successResponse = createSuccessResponse(enhancedLesson)

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

    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      select: {
        teacherId: true,
      },
    })

    if (!existingLesson) {
      return createErrorResponse('Lesson not found', 404)
    }

    if (user.role !== 'SUPER_ADMIN' && existingLesson.teacherId !== user.id) {
      return createForbiddenResponse('Bu dersi silme yetkiniz yok')
    }

    // Önce konuları sil (cascade delete)
    await prisma.lessonTopic.deleteMany({
      where: { lessonId: id },
    })

    // Sonra dersi sil
    await prisma.lesson.delete({
      where: { id },
    })

    const successResponse = createSuccessResponse({ success: true })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Lesson deletion')
  }
}
