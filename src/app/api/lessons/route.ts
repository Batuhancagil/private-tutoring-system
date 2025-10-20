import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createLessonSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { transformLessonToAPI, transformLessonFromAPI, transformTopicToAPI, type LessonDB, type LessonTopicDB } from '@/lib/transformers'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Get total count
    const totalCountResult = await prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM lessons`
    const totalCount = Number(totalCountResult[0].count)

    // Raw query ile dersleri getir (paginated)
    const rawLessons = await prisma.$queryRaw`SELECT * FROM lessons ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${skip}`

    // Topics'ları ayrı olarak getir (topics → lesson_topics)
    const rawTopics = await prisma.$queryRaw`SELECT * FROM lesson_topics ORDER BY "lessonTopicOrder" ASC`

    // Raw data'yı formatla - DB format'tan API format'a dönüştür
    const formattedLessons = (rawLessons as LessonDB[]).map(lesson => {
      // Lesson'ı API formatına çevir
      const apiLesson = transformLessonToAPI(lesson)

      // Bu lesson'a ait topic'leri bul ve API formatına çevir
      const lessonTopics = (rawTopics as LessonTopicDB[])
        .filter(topic => topic.lessonId === lesson.id)
        .map(topic => transformTopicToAPI(topic))

      return {
        ...apiLesson,
        topics: lessonTopics
      }
    })

    const successResponse = createSuccessResponse({
      data: formattedLessons,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
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

    const lesson = await prisma.lesson.create({
      data: {
        name: validation.data.name,
        lessonGroup: validation.data.group,
        lessonExamType: validation.data.type,
        lessonSubject: validation.data.subject || null,
        color: assignedColor,
        teacherId: user.id
      }
    })

    // Transform DB data back to API format
    const apiLesson = transformLessonToAPI(lesson as LessonDB)

    const successResponse = createSuccessResponse(apiLesson, 201)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Lesson creation')
  }
}
