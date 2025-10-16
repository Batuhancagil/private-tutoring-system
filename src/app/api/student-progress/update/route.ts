import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { studentId, topicId, correctCount, wrongCount, emptyCount } = await request.json()

    if (!studentId || !topicId) {
      return NextResponse.json({
        success: false,
        error: 'studentId and topicId are required'
      }, { status: 400 })
    }

    // Validate counts
    const correct = Math.max(0, parseInt(correctCount) || 0)
    const wrong = Math.max(0, parseInt(wrongCount) || 0)
    const empty = Math.max(0, parseInt(emptyCount) || 0)
    const solvedCount = correct + wrong + empty

    console.log('📊 Updating progress:', { studentId, topicId, correct, wrong, empty, solvedCount })

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

    // Update the progress record
    const updatedProgress = await prisma.studentProgress.update({
      where: {
        id: progressRecord.id
      },
      data: {
        correctCount: correct,
        wrongCount: wrong,
        emptyCount: empty,
        solvedCount: solvedCount,
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
      correctCount: updatedProgress.correctCount,
      wrongCount: updatedProgress.wrongCount,
      emptyCount: updatedProgress.emptyCount,
      solvedCount: updatedProgress.solvedCount,
      totalCount: updatedProgress.totalCount
    })

    return NextResponse.json({
      success: true,
      data: {
        topicId: updatedProgress.topicId,
        correctCount: updatedProgress.correctCount,
        wrongCount: updatedProgress.wrongCount,
        emptyCount: updatedProgress.emptyCount,
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
