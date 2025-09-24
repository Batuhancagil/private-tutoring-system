import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/weekly-schedules?studentId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }
    
    const schedules = await prisma.weeklySchedule.findMany({
      where: { studentId },
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
              }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(schedules, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch weekly schedules',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST /api/weekly-schedules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, title, startDate, endDate, assignments } = body
    
    if (!studentId || !title || !startDate || !endDate || !assignments) {
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, title, startDate, endDate, assignments' 
      }, { status: 400 })
    }
    
    // Create the main schedule
    const schedule = await prisma.weeklySchedule.create({
      data: {
        studentId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    })
    
    // Calculate weeks between start and end date
    const start = new Date(startDate)
    const end = new Date(endDate)
    const weeksDiff = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))
    
    // Create week plans
    const weekPlans = []
    for (let weekNum = 1; weekNum <= weeksDiff; weekNum++) {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + (weekNum - 1) * 7)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      const weekPlan = await prisma.weeklyScheduleWeek.create({
        data: {
          scheduleId: schedule.id,
          weekNumber: weekNum,
          startDate: weekStart,
          endDate: weekEnd
        }
      })
      
      weekPlans.push(weekPlan)
    }
    
    // Assign topics to weeks (one topic per week in assignment order)
    for (let i = 0; i < assignments.length && i < weekPlans.length; i++) {
      const assignment = assignments[i]
      const weekPlan = weekPlans[i]
      
      await prisma.weeklyScheduleTopic.create({
        data: {
          weekPlanId: weekPlan.id,
          assignmentId: assignment.id,
          topicOrder: i + 1
        }
      })
    }
    
    // Fetch the complete schedule with relations
    const completeSchedule = await prisma.weeklySchedule.findUnique({
      where: { id: schedule.id },
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
              }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    })
    
    return NextResponse.json(completeSchedule, { status: 201 })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create weekly schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
