import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const assignmentId = searchParams.get('assignmentId')
    const topicId = searchParams.get('topicId')
    const resourceId = searchParams.get('resourceId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Build where clause dynamically
    const where: Record<string, string> = {}
    if (studentId) where.studentId = studentId
    if (assignmentId) where.studentAssignmentId = assignmentId  // assignmentId → studentAssignmentId
    if (topicId) where.lessonTopicId = topicId  // topicId → lessonTopicId
    if (resourceId) where.resourceId = resourceId

    // Get total count
    const totalCount = await prisma.studentProgress.count({
      where
    })

    // Get paginated data
    const progress = await prisma.studentProgress.findMany({
      where,
      skip,
      take: limit,
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
      },
      orderBy: { studentProgressLastSolvedAt: 'desc' }  // lastSolvedAt → studentProgressLastSolvedAt
    })

    return NextResponse.json({
      data: progress,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Get student progress error:', error)
    return NextResponse.json({
      error: 'Failed to fetch student progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { studentId, assignmentId, resourceId, topicId, solvedCount, correctCount, wrongCount, emptyCount } = await request.json()

    if (!studentId || !assignmentId || !resourceId || !topicId) {
      return NextResponse.json({
        error: 'studentId, assignmentId, resourceId, and topicId are required'
      }, { status: 400 })
    }

    // Check if progress record already exists
    const existingProgress = await prisma.studentProgress.findUnique({
      where: {
        studentId_studentAssignmentId_resourceId: {  // Updated unique constraint name
          studentId,
          studentAssignmentId: assignmentId,  // assignmentId → studentAssignmentId
          resourceId
        }
      }
    })

    let progress
    if (existingProgress) {
      // Update existing progress
      progress = await prisma.studentProgress.update({
        where: { id: existingProgress.id },
        data: {
          studentProgressSolvedCount: solvedCount ?? existingProgress.studentProgressSolvedCount,  // solvedCount → studentProgressSolvedCount
          studentProgressCorrectCount: correctCount ?? existingProgress.studentProgressCorrectCount,  // NEW
          studentProgressWrongCount: wrongCount ?? existingProgress.studentProgressWrongCount,  // NEW
          studentProgressEmptyCount: emptyCount ?? existingProgress.studentProgressEmptyCount,  // NEW
          studentProgressLastSolvedAt: new Date(),  // lastSolvedAt → studentProgressLastSolvedAt
          updatedAt: new Date()
          // totalCount removed - no longer in schema
        },
        include: {
          student: { select: { id: true, name: true } },
          studentAssignment: { select: { id: true, lessonTopicId: true } },  // assignment → studentAssignment, topicId → lessonTopicId
          resource: { select: { id: true, resourceName: true } },  // name → resourceName
          lessonTopic: { select: { id: true, lessonTopicName: true } }  // topic → lessonTopic, name → lessonTopicName
        }
      })
    } else {
      // Create new progress record
      progress = await prisma.studentProgress.create({
        data: {
          studentId,
          studentAssignmentId: assignmentId,  // assignmentId → studentAssignmentId
          resourceId,
          lessonTopicId: topicId,  // topicId → lessonTopicId
          studentProgressSolvedCount: solvedCount ?? 0,  // solvedCount → studentProgressSolvedCount
          studentProgressCorrectCount: correctCount ?? 0,  // NEW
          studentProgressWrongCount: wrongCount ?? 0,  // NEW
          studentProgressEmptyCount: emptyCount ?? 0,  // NEW
          studentProgressLastSolvedAt: new Date()  // lastSolvedAt → studentProgressLastSolvedAt
          // totalCount removed - no longer in schema
        },
        include: {
          student: { select: { id: true, name: true } },
          studentAssignment: { select: { id: true, lessonTopicId: true } },  // assignment → studentAssignment, topicId → lessonTopicId
          resource: { select: { id: true, resourceName: true } },  // name → resourceName
          lessonTopic: { select: { id: true, lessonTopicName: true } }  // topic → lessonTopic, name → lessonTopicName
        }
      })
    }

    return NextResponse.json(progress, { status: 201 })
  } catch (error) {
    console.error('Student progress error:', error)
    return NextResponse.json({
      error: 'Failed to update student progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
