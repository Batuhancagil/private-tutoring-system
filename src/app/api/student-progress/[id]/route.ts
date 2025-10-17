import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const progress = await prisma.studentProgress.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, name: true }
        },
        studentAssignment: {  // assignment → studentAssignment
          select: { id: true, lessonTopicId: true, assignedAt: true }  // topicId → lessonTopicId
        },
        resource: {
          select: { id: true, resourceName: true }  // name → resourceName
        },
        lessonTopic: {  // topic → lessonTopic
          select: { id: true, lessonTopicName: true, lessonTopicOrder: true }  // name → lessonTopicName, order → lessonTopicOrder
        }
      }
    })

    if (!progress) {
      return NextResponse.json({ error: 'Progress not found' }, { status: 404 })
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { solvedCount, correctCount, wrongCount, emptyCount } = await request.json()

    if (solvedCount === undefined && correctCount === undefined && wrongCount === undefined && emptyCount === undefined) {
      return NextResponse.json({ error: 'At least one count field is required' }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    }

    // Field names updated to match new schema
    if (solvedCount !== undefined) updateData.studentProgressSolvedCount = solvedCount
    if (correctCount !== undefined) updateData.studentProgressCorrectCount = correctCount
    if (wrongCount !== undefined) updateData.studentProgressWrongCount = wrongCount
    if (emptyCount !== undefined) updateData.studentProgressEmptyCount = emptyCount
    if (solvedCount !== undefined) updateData.studentProgressLastSolvedAt = new Date()

    const progress = await prisma.studentProgress.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, name: true } },
        studentAssignment: { select: { id: true, lessonTopicId: true } },  // assignment → studentAssignment, topicId → lessonTopicId
        resource: { select: { id: true, resourceName: true } },  // name → resourceName
        lessonTopic: { select: { id: true, lessonTopicName: true } }  // topic → lessonTopic, name → lessonTopicName
      }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Update progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to update progress',
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

    await prisma.studentProgress.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
