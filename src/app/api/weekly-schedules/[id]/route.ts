import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { validateRequest, updateWeeklyScheduleSchema } from '@/lib/validations'
import { createValidationErrorResponse } from '@/lib/error-handler'

// GET /api/weekly-schedules/[id] - Get single schedule with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { id: scheduleId } = await params
    
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }
    
    const schedule = await prisma.weeklySchedule.findUnique({
      where: { id: scheduleId },
      include: {
        weekPlans: {
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
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })
    
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const successResponse = NextResponse.json(schedule, { status: 200 })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT /api/weekly-schedules/[id] - Update schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: scheduleId } = await params
    const body = await request.json()

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Validate request body
    const validation = validateRequest(updateWeeklyScheduleSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { title, startDate, endDate, isActive } = validation.data

    const updatedSchedule = await prisma.weeklySchedule.update({
      where: { id: scheduleId },
      data: {
        ...(title && { title }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(typeof isActive === 'boolean' && { isActive })
      }
    })

    const successResponse = NextResponse.json(updatedSchedule, { status: 200 })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/weekly-schedules/[id] - Delete schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: scheduleId } = await params
    
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }
    
    // Delete schedule (cascade will handle related records)
    await prisma.weeklySchedule.delete({
      where: { id: scheduleId }
    })

    const successResponse = NextResponse.json({ message: 'Schedule deleted successfully' }, { status: 200 })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
