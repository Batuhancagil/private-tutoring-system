import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { validateRequest, createAssignmentSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createErrorResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { transformAssignmentToAPI } from '@/lib/transformers'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

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

      const successResponse = createSuccessResponse({
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

      return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
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

    const successResponse = createSuccessResponse({
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

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)

  } catch (error) {
    return handleAPIError(error, 'Student assignment')
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      const emptyResponse = createSuccessResponse([])
      return addRateLimitHeaders(emptyResponse, request, RateLimitPresets.LENIENT)
    }

    // Get assignments with questionCounts
    const assignments = await prisma.studentAssignment.findMany({
      where: { studentId },
      select: {
        id: true,
        studentId: true,
        lessonTopicId: true,
        assignedAt: true,
        completed: true,
        studentAssignmentCompletedAt: true,
        studentAssignedResourceTopicQuestionCounts: true
      },
      orderBy: { assignedAt: 'desc' }
    })

    // Transform assignments to use topicId instead of lessonTopicId for frontend compatibility
    const transformedAssignments = assignments.map(assignment => transformAssignmentToAPI({
      ...assignment,
      studentAssignmentCompletedAt: assignment.studentAssignmentCompletedAt || null
    }))

    const successResponse = createSuccessResponse(transformedAssignments)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return handleAPIError(error, 'Assignments fetch')
  }
}
