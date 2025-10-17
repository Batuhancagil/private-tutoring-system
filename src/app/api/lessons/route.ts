import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createLessonSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'

export async function GET() {
  try {
    // Raw query ile dersleri getir
    const rawLessons = await prisma.$queryRaw`SELECT * FROM lessons ORDER BY "createdAt" DESC`

    // Topics'ları ayrı olarak getir
    const rawTopics = await prisma.$queryRaw`SELECT * FROM topics ORDER BY "order" ASC`

    // Raw data'yı formatla
    const formattedLessons = (rawLessons as Record<string, unknown>[]).map(lesson => ({
      id: lesson.id as string,
      name: lesson.name as string,
      group: lesson.group as string,
      type: lesson.type as string,
      subject: lesson.subject as string | null,
      color: (lesson.color as string) || 'blue', // Default to blue if not set
      userId: lesson.userId as string,
      createdAt: lesson.createdAt as string,
      topics: (rawTopics as Record<string, unknown>[]).filter(topic => topic.lessonId === lesson.id).map(topic => ({
        id: topic.id as string,
        name: topic.name as string,
        order: topic.order as number,
        lessonId: topic.lessonId as string,
        createdAt: topic.createdAt as string
      }))
    }))

    return createSuccessResponse(formattedLessons)
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
    const availableColors = ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'gray']

    // If color not provided, assign one automatically
    let assignedColor = color
    if (!assignedColor) {
      // Get existing lesson colors to avoid duplicates
      const existingLessons = await prisma.lesson.findMany({
        select: { color: true }
      })

      const usedColors = new Set(existingLessons.map(l => l.color))

      // Find first unused color
      assignedColor = availableColors.find(c => !usedColors.has(c)) || 'blue'
    }

    const lesson = await prisma.lesson.create({
      data: {
        name,
        group,
        type: type || 'TYT', // Fallback to TYT if not provided
        subject: subject || null,
        color: assignedColor,
        userId: user.id
      }
    })

    return createSuccessResponse(lesson, 201)
  } catch (error) {
    return handleAPIError(error, 'Lesson creation')
  }
}
