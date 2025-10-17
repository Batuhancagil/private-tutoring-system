import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createLessonSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'

export async function GET(request: NextRequest) {
  try {
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

    // Raw data'yı formatla
    const formattedLessons = (rawLessons as Record<string, unknown>[]).map(lesson => ({
      id: lesson.id as string,
      name: lesson.name as string,
      lessonGroup: lesson.lessonGroup as string,        // group → lessonGroup
      lessonExamType: lesson.lessonExamType as string,  // type → lessonExamType
      lessonSubject: lesson.lessonSubject as string | null,  // subject → lessonSubject
      color: (lesson.color as string) || 'blue', // Default to blue if not set
      teacherId: lesson.teacherId as string,  // userId → teacherId
      createdAt: lesson.createdAt as string,
      topics: (rawTopics as Record<string, unknown>[]).filter(topic => topic.lessonId === lesson.id).map(topic => ({
        id: topic.id as string,
        lessonTopicName: topic.lessonTopicName as string,  // name → lessonTopicName
        lessonTopicOrder: topic.lessonTopicOrder as number,  // order → lessonTopicOrder
        lessonId: topic.lessonId as string,
        createdAt: topic.createdAt as string
      }))
    }))

    return createSuccessResponse({
      data: formattedLessons,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    return handleAPIError(error, 'Lessons fetch')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const body = await request.json()

    // Validate request body
    const validation = validateRequest(createLessonSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { name, group, type, subject, color } = validation.data

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
        name,
        lessonGroup: group,  // group → lessonGroup
        lessonExamType: type || 'TYT',  // type → lessonExamType
        lessonSubject: subject || null,  // subject → lessonSubject
        color: assignedColor,
        teacherId: user.id  // userId → teacherId
      }
    })

    return createSuccessResponse(lesson, 201)
  } catch (error) {
    return handleAPIError(error, 'Lesson creation')
  }
}
