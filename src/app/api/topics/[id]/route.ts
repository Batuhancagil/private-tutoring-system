import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateTopicSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Handle questionCount separately (not part of updateTopicSchema)
    if (body.questionCount !== undefined && Object.keys(body).length === 1) {
      // Geçici olarak sadece response döndür, database güncellemesi yapma
      return createSuccessResponse({
        id,
        questionCount: parseInt(body.questionCount) || 0,
        message: 'Question count updated (temporary - database not updated)'
      })
    }

    // Validate request body
    const validation = validateRequest(updateTopicSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { name, order, lessonId } = validation.data

    const updateData: {
      name?: string
      order?: number
      lessonId?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (order !== undefined) updateData.order = order
    if (lessonId !== undefined) updateData.lessonId = lessonId

    const topic = await prisma.topic.update({
      where: { id },
      data: updateData
    })

    return createSuccessResponse(topic)
  } catch (error) {
    return handleAPIError(error, 'Topic update')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.topic.delete({
      where: { id }
    })

    return createSuccessResponse({ success: true })
  } catch (error) {
    return handleAPIError(error, 'Topic deletion')
  }
}
