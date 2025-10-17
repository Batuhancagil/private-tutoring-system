import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateLessonSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = validateRequest(updateLessonSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { name, group, type, subject, color } = validation.data

    const updateData: {
      name?: string
      lessonGroup?: string       // group → lessonGroup
      lessonExamType?: string    // type → lessonExamType
      lessonSubject?: string | null  // subject → lessonSubject
      color?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (group !== undefined) updateData.lessonGroup = group  // group → lessonGroup
    if (type !== undefined) updateData.lessonExamType = type  // type → lessonExamType
    if (subject !== undefined) updateData.lessonSubject = subject || null  // subject → lessonSubject
    if (color !== undefined) updateData.color = color

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData
    })

    return createSuccessResponse(lesson)
  } catch (error) {
    return handleAPIError(error, 'Lesson update')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Önce konuları sil (cascade delete)
    await prisma.lessonTopic.deleteMany({  // topic → lessonTopic
      where: { lessonId: id }
    })

    // Sonra dersi sil
    await prisma.lesson.delete({
      where: { id }
    })

    return createSuccessResponse({ success: true })
  } catch (error) {
    return handleAPIError(error, 'Lesson deletion')
  }
}
