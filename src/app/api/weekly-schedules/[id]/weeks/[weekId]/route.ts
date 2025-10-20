import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { validateRequest, updateWeeklyScheduleWeekSchema } from '@/lib/validations'
import { createValidationErrorResponse } from '@/lib/error-handler'

// GET /api/weekly-schedules/[id]/weeks/[weekId] - Get single week details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, weekId: string }> }
) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { weekId } = await params
    
    if (!weekId) {
      return NextResponse.json({ error: 'Week ID is required' }, { status: 400 })
    }
    
    const week = await prisma.weeklyScheduleWeek.findUnique({
      where: { id: weekId },
      include: {
        schedule: true,
        weekTopics: {
          include: {
            assignment: {
              include: {
                lessonTopic: {  // topic → lessonTopic
                  include: {
                    lesson: true
                  }
                }
              }
            }
          },
          orderBy: { topicOrder: 'asc' }
        }
      }
    })
    
    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }

    const successResponse = NextResponse.json(week, { status: 200 })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch week',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/weekly-schedules/[id]/weeks/[weekId] - Update week
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, weekId: string }> }
) {
  try {
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { weekId } = await params
    const body = await request.json()

    if (!weekId) {
      return NextResponse.json({ error: 'Week ID is required' }, { status: 400 })
    }

    // Validate request body
    const validation = validateRequest(updateWeeklyScheduleWeekSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { startDate, endDate, weekTopics } = validation.data
    
    // Use transaction to update week and topics
    await prisma.$transaction(async (tx) => {
      // Update week dates if provided
      const updatedWeek = await tx.weeklyScheduleWeek.update({
        where: { id: weekId },
        data: {
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) })
        }
      })
      
      // Update topics if provided
      if (weekTopics && Array.isArray(weekTopics)) {
        // Delete existing topics
        await tx.weeklyScheduleTopic.deleteMany({
          where: { weekPlanId: weekId }
        })
        
        // Create new topics
        if (weekTopics.length > 0) {
          await tx.weeklyScheduleTopic.createMany({
            data: weekTopics.map((topic: any, index: number) => ({
              weekPlanId: weekId,
              assignmentId: topic.assignmentId,
              topicOrder: index + 1,
              isCompleted: topic.isCompleted || false
            }))
          })
        }
      }
      
      return updatedWeek
    })
    
    // Fetch updated week with topics
    const updatedWeekWithTopics = await prisma.weeklyScheduleWeek.findUnique({
      where: { id: weekId },
      include: {
        weekTopics: {
          include: {
            assignment: {
              include: {
                lessonTopic: {  // topic → lessonTopic
                  include: {
                    lesson: true
                  }
                }
              }
            }
          },
          orderBy: { topicOrder: 'asc' }
        }
      }
    })
    
    const successResponse = NextResponse.json(updatedWeekWithTopics, { status: 200 })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update week',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
