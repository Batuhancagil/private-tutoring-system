import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createLessonSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import {
  transformLessonToAPI,
  transformLessonFromAPI,
  transformTopicToAPI,
  type LessonDB,
  type LessonTopicDB,
} from '@/lib/transformers'

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

    const whereClause = user.role === 'SUPER_ADMIN' ? {} : { teacherId: user.id }

    const [totalCount, lessons] = await prisma.$transaction([
      prisma.lesson.count({ where: whereClause }),
      prisma.lesson.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          topics: {
            orderBy: { lessonTopicOrder: 'asc' },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ])

    const formattedLessons = lessons.map((lesson) => {
      const apiLesson = transformLessonToAPI(lesson as unknown as LessonDB)

      const lessonTopics = lesson.topics.map((topic) =>
        transformTopicToAPI(topic as unknown as LessonTopicDB)
      )

      return {
        ...apiLesson,
        teacherName: user.role === 'SUPER_ADMIN' ? lesson.teacher?.name ?? null : null,
        teacherEmail: user.role === 'SUPER_ADMIN' ? lesson.teacher?.email ?? null : null,
        topics: lessonTopics,
      }
    })

    const successResponse = createSuccessResponse({
      data: formattedLessons,
      pagination: {
        page,
        limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return handleAPIError(error, 'Lessons fetch')
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

    // Validate request body
    const validation = validateRequest(createLessonSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { color } = validation.data

    // Available colors for automatic assignment
    const availableColors: Array<'blue' | 'purple' | 'green' | 'emerald' | 'orange' | 'red' | 'gray'> =
      ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'gray']

    // If color not provided, assign one automatically
    let assignedColor: 'blue' | 'purple' | 'green' | 'emerald' | 'orange' | 'red' | 'gray' = color || 'blue'
    if (!color) {
      // Get existing lesson colors to avoid duplicates
      const existingLessons = await prisma.lesson.findMany({
        select: { color: true }
      })

      const usedColors = new Set(existingLessons.map(l => l.color))

      // Find first unused color
      const foundColor = availableColors.find(c => !usedColors.has(c))
      assignedColor = foundColor !== undefined ? foundColor : 'blue'
    }

    // Ensure lesson name is unique per teacher
    const lesson = await prisma.lesson.create({
      data: {
        name: validation.data.name,
        lessonGroup: validation.data.group,
        lessonExamType: validation.data.type,
        lessonSubject: validation.data.subject || null,
        color: assignedColor,
        teacherId: user.id,
      },
    })

    // Transform DB data back to API format
    const apiLesson = transformLessonToAPI(lesson as LessonDB)

    const successResponse = createSuccessResponse(apiLesson, 201)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Lesson creation')
  }
}
