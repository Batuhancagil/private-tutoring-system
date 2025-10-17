import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateLessonSchema } from '@/lib/validations'

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
      return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
    }

    const { name, group, type, subject, color } = validation.data

    const updateData: {
      name?: string
      group?: string
      type?: string
      subject?: string | null
      color?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (group !== undefined) updateData.group = group
    if (type !== undefined) updateData.type = type
    if (subject !== undefined) updateData.subject = subject || null
    if (color !== undefined) updateData.color = color

    const lesson = await prisma.lesson.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(lesson)
  } catch (error) {
    console.error('Lesson update error:', error)
    return NextResponse.json({
      error: 'Failed to update lesson',
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

    // Önce konuları sil (cascade delete)
    await prisma.topic.deleteMany({
      where: { lessonId: id }
    })

    // Sonra dersi sil
    await prisma.lesson.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Lesson delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete lesson',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
