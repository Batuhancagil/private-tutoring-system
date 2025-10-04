import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/weekly-schedules/[id] - Get single schedule with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
                    topic: {
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
    
    return NextResponse.json(schedule, { status: 200 })
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
    const { id: scheduleId } = await params
    const body = await request.json()
    const { title, startDate, endDate, isActive } = body
    
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }
    
    const updatedSchedule = await prisma.weeklySchedule.update({
      where: { id: scheduleId },
      data: {
        ...(title && { title }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(typeof isActive === 'boolean' && { isActive })
      }
    })
    
    return NextResponse.json(updatedSchedule, { status: 200 })
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
    const { id: scheduleId } = await params
    
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }
    
    // Delete schedule (cascade will handle related records)
    await prisma.weeklySchedule.delete({
      where: { id: scheduleId }
    })
    
    return NextResponse.json({ message: 'Schedule deleted successfully' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
