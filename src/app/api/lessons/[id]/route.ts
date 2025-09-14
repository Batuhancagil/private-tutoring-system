import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, group, type, subject } = await request.json()
    
    if (!name || !group) {
      return NextResponse.json({ error: 'Name and group are required' }, { status: 400 })
    }

    const lesson = await prisma.lesson.update({
      where: { id },
      data: { 
        name, 
        group, 
        type: type || 'TYT', // Fallback to TYT if not provided
        subject: subject || null
      }
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
