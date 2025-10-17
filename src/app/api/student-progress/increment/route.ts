import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateProgressSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validation = validateRequest(updateProgressSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { studentId, assignmentId, resourceId, topicId, increment = 1 } = validation.data

    // Check if progress record exists
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
      // Update existing progress with increment
      progress = await prisma.studentProgress.update({
        where: { id: existingProgress.id },
        data: {
          studentProgressSolvedCount: { increment },  // solvedCount → studentProgressSolvedCount
          studentProgressLastSolvedAt: new Date(),  // lastSolvedAt → studentProgressLastSolvedAt
          updatedAt: new Date()
        },
        include: {
          student: { select: { id: true, name: true } },
          studentAssignment: { select: { id: true, lessonTopicId: true } },  // assignment → studentAssignment, topicId → lessonTopicId
          resource: { select: { id: true, resourceName: true } },  // name → resourceName
          lessonTopic: { select: { id: true, lessonTopicName: true } }  // topic → lessonTopic, name → lessonTopicName
        }
      })
    } else {
      // Create new progress record with initial count
      progress = await prisma.studentProgress.create({
        data: {
          studentId,
          studentAssignmentId: assignmentId,  // assignmentId → studentAssignmentId
          resourceId,
          lessonTopicId: topicId,  // topicId → lessonTopicId
          studentProgressSolvedCount: increment,  // solvedCount → studentProgressSolvedCount
          studentProgressCorrectCount: 0,  // NEW field
          studentProgressWrongCount: 0,    // NEW field
          studentProgressEmptyCount: 0,    // NEW field
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

    return createSuccessResponse(progress, 201)
  } catch (error) {
    return handleAPIError(error, 'Student progress increment')
  }
}
