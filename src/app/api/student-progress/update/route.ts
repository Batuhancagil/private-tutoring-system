import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { studentId, topicId, increment = 1 } = await request.json()

    if (!studentId || !topicId) {
      return NextResponse.json({
        success: false,
        error: 'studentId and topicId are required'
      }, { status: 400 })
    }

    console.log('📊 Updating progress:', { studentId, topicId, increment })

    // Find the progress record
    const progressRecord = await prisma.studentProgress.findFirst({
      where: {
        studentId: studentId,
        topicId: topicId
      }
    })

    if (!progressRecord) {
      return NextResponse.json({
        success: false,
        error: 'Progress record not found'
      }, { status: 404 })
    }

    // Update the solved count
    const updatedProgress = await prisma.studentProgress.update({
      where: {
        id: progressRecord.id
      },
      data: {
        solvedCount: {
          increment: increment
        },
        lastSolvedAt: new Date()
      },
      include: {
        topic: {
          include: {
            lesson: true
          }
        }
      }
    })

    console.log('✅ Progress updated:', {
      topicId,
      newSolvedCount: updatedProgress.solvedCount,
      totalCount: updatedProgress.totalCount
    })

    return NextResponse.json({
      success: true,
      data: {
        topicId: updatedProgress.topicId,
        solvedCount: updatedProgress.solvedCount,
        totalCount: updatedProgress.totalCount,
        topicName: updatedProgress.topic.name,
        lessonName: updatedProgress.topic.lesson.name
      }
    })

  } catch (error) {
    console.error('❌ Error updating progress:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
