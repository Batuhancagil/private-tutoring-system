import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateProgressSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Basic validation for required fields
    if (!body.studentId || !body.topicId) {
      return NextResponse.json({
        success: false,
        error: 'studentId and topicId are required'
      }, { status: 400 })
    }

    // Create a validation object with the progress data
    const validationData = {
      studentId: body.studentId,
      assignmentId: body.assignmentId || 'temp-id', // Temporary ID for validation
      resourceId: body.resourceId || 'temp-id', // Temporary ID for validation
      topicId: body.topicId,
      correctCount: body.correctCount,
      wrongCount: body.wrongCount,
      emptyCount: body.emptyCount
    }

    // Validate request body (only validates the fields we care about)
    const validation = validateRequest(updateProgressSchema, validationData)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.error
      }, { status: 400 })
    }

    const { studentId, topicId, correctCount, wrongCount, emptyCount } = validation.data

    // Validate counts
    const correct = Math.max(0, parseInt(String(correctCount || 0)))
    const wrong = Math.max(0, parseInt(String(wrongCount || 0)))
    const empty = Math.max(0, parseInt(String(emptyCount || 0)))
    const solvedCount = correct + wrong + empty

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
