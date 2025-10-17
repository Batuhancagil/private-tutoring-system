import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, createAssignmentSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createErrorResponse } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { studentId, topicIds, questionCounts } = body

    // Handle the case where topicIds is an array (multiple assignments)
    // We'll validate each topic assignment individually
    if (!studentId || !topicIds || !Array.isArray(topicIds)) {
      return createErrorResponse('Student ID and topic IDs are required', 400)
    }

    // Validate at least the studentId field is valid
    if (topicIds.length > 0) {
      // Validate the first assignment to ensure structure is correct
      const sampleValidation = validateRequest(createAssignmentSchema, {
        studentId,
        topicId: topicIds[0],
        questionCounts
      })
      if (!sampleValidation.success) {
        return createValidationErrorResponse(sampleValidation.error)
      }
    }

    // First, let's check if the table exists by trying to count records
    try {
      const tableExists = await prisma.studentAssignment.count()
    } catch (tableError) {
      console.error('Table might not exist:', tableError)
      return createErrorResponse(
        'Database table not found',
        500,
        tableError instanceof Error ? tableError.message : 'Unknown error'
      )
    }

    // Handle empty topicIds case (remove all assignments)
    if (topicIds.length === 0) {
      const deletedCount = await prisma.studentAssignment.deleteMany({
        where: { studentId }
      })

      return createSuccessResponse({
        message: 'All topics removed successfully',
        assignments: 0,
        studentId,
        topicIds: [],
        totalAssignments: 0,
        debug: {
          deletedCount: deletedCount.count,
          summary: {
            deleted: deletedCount.count,
            requested: 0,
            created: 0,
            totalAfter: 0
          }
        }
      }, 201)
    }

    // Validate topics exist
    const topicsInDb = await prisma.lessonTopic.findMany({  // topic → lessonTopic
      where: { id: { in: topicIds } },
      select: { id: true }
    })
    const validTopicIdSet = new Set(topicsInDb.map(t => t.id))
    const invalidTopicIds = topicIds.filter(id => !validTopicIdSet.has(id))

    if (invalidTopicIds.length > 0) {
      return createErrorResponse('Some topics not found', 400, { invalidTopicIds })
    }

    // Delete all existing assignments for this student
    const deletedCount = await prisma.studentAssignment.deleteMany({
      where: { studentId }
    })

    // Create new assignments
    const assignments = [] as Array<{ id: string; lessonTopicId: string }>
    const perTopicResults: Array<{ topicId: string; status: 'created' | 'error'; error?: string }> = []

    for (const topicId of topicIds) {
      try {
        const assignment = await prisma.studentAssignment.create({
          data: {
            studentId,
            lessonTopicId: topicId,  // topicId → lessonTopicId
            assignedAt: new Date(),
            completed: false,
            studentAssignedResourceTopicQuestionCounts: questionCounts && questionCounts[topicId] ? questionCounts[topicId] : null  // questionCounts → studentAssignedResourceTopicQuestionCounts
          },
          select: { id: true, lessonTopicId: true }  // topicId → lessonTopicId
        })
        assignments.push(assignment)
        perTopicResults.push({ topicId, status: 'created' })
      } catch (assignmentError) {
        console.error('Error creating assignment for topic:', topicId, assignmentError)
        perTopicResults.push({ topicId, status: 'error', error: assignmentError instanceof Error ? assignmentError.message : 'Unknown error' })
      }
    }

    // Verify assignments were created
    const totalAssignments = await prisma.studentAssignment.count({ where: { studentId } })

    return createSuccessResponse({
      message: 'Topics assigned successfully',
      assignments: assignments.length,
      studentId,
      topicIds,
      totalAssignments,
      debug: {
        tableExists: true,
        deletedCount: deletedCount.count,
        perTopicResults,
        createdAssignments: assignments,
        allAssignments: await prisma.studentAssignment.findMany({
          where: { studentId },
          select: { id: true, lessonTopicId: true, assignedAt: true }  // topicId → lessonTopicId
        }),
        summary: {
          deleted: deletedCount.count,
          requested: topicIds.length,
          created: assignments.length,
          totalAfter: totalAssignments
        }
      }
    }, 201)

  } catch (error) {
    return handleAPIError(error, 'Student assignment')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return createSuccessResponse([])
    }

    // Get assignments with questionCounts
    const assignments = await prisma.studentAssignment.findMany({
      where: { studentId },
      select: {
        id: true,
        studentId: true,
        lessonTopicId: true,  // topicId → lessonTopicId
        assignedAt: true,
        completed: true,
        studentAssignedResourceTopicQuestionCounts: true  // questionCounts → studentAssignedResourceTopicQuestionCounts
      },
      orderBy: { assignedAt: 'desc' }
    })

    return createSuccessResponse(assignments)
  } catch (error) {
    return handleAPIError(error, 'Assignments fetch')
  }
}
