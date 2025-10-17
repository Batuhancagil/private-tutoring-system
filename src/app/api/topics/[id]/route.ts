import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateTopicSchema } from '@/lib/validations'

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
      return NextResponse.json({
        id,
        questionCount: parseInt(body.questionCount) || 0,
        message: 'Question count updated (temporary - database not updated)'
      })
    }

    // Validate request body
    const validation = validateRequest(updateTopicSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
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

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Topic update error:', error)
    return NextResponse.json({
      error: 'Failed to update topic',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Topic delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete topic',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
