import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateRequest, createWeeklyScheduleSchema } from '@/lib/validations'

// GET /api/weekly-schedules?studentId=xxx&page=1&limit=10&includeDetails=true&weekPage=0&filter=current
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const includeDetails = searchParams.get('includeDetails') === 'true'
    const onlyActive = searchParams.get('onlyActive') === 'true'
    const weekPage = searchParams.has('weekPage') ? parseInt(searchParams.get('weekPage')!) : null
    const filter = searchParams.get('filter') // 'all', 'current', 'past'
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 })
    }
    
    // Build where clause
    const whereClause: any = { studentId }
    if (onlyActive) {
      whereClause.isActive = true
    }
    
    // Build include clause based on needs
    const includeClause: any = {}
    if (includeDetails) {
      includeClause.weekPlans = {
        // If weekPage is specified, only fetch that 4-week chunk
        ...(weekPage !== null ? {
          skip: weekPage * 4,
          take: 4
        } : {}),
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
    
    const schedules = await prisma.weeklySchedule.findMany({
      where: whereClause,
      include: includeClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
    
    // Get total count for pagination
    const totalCount = await prisma.weeklySchedule.count({
      where: whereClause
    })
    
    // Apply filter to weeks if needed
    if (filter && schedules.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      schedules.forEach(schedule => {
        if (schedule.weekPlans) {
          if (filter === 'current') {
            // Only weeks from today onwards (including current week)
            schedule.weekPlans = schedule.weekPlans.filter((week: any) => {
              const weekEnd = new Date(week.endDate)
              weekEnd.setHours(23, 59, 59, 999)
              return weekEnd >= today
            })
          } else if (filter === 'past') {
            // Only past weeks (ended before today)
            schedule.weekPlans = schedule.weekPlans.filter((week: any) => {
              const weekEnd = new Date(week.endDate)
              weekEnd.setHours(23, 59, 59, 999)
              return weekEnd < today
            })
          }
          // 'all' returns everything (no filter)
        }
      })
    }
    
    // Get total week count for the first schedule (for week pagination)
    let totalWeeks = 0
    if (schedules.length > 0 && weekPage !== null) {
      const firstSchedule = await prisma.weeklySchedule.findUnique({
        where: { id: schedules[0].id },
        include: {
          weekPlans: {
            select: { id: true }
          }
        }
      })
      totalWeeks = firstSchedule?.weekPlans.length || 0
    }
    
    return NextResponse.json({
      schedules,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        weekPage: weekPage !== null ? weekPage : undefined,
        totalWeeks: weekPage !== null ? totalWeeks : undefined
      }
    }, { status: 200 })
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

    // Validate request body
    const validation = validateRequest(createWeeklyScheduleSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
    }

    const { studentId, title, startDate, endDate, assignments } = validation.data
    
    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the main schedule
      const schedule = await tx.weeklySchedule.create({
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
      
      // Prepare week plans data for batch insert
      const weekPlansData = []
      for (let weekNum = 1; weekNum <= weeksDiff; weekNum++) {
        const weekStart = new Date(start)
        weekStart.setDate(start.getDate() + (weekNum - 1) * 7)
        
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        
        weekPlansData.push({
          scheduleId: schedule.id,
          weekNumber: weekNum,
          startDate: weekStart,
          endDate: weekEnd
        })
      }
      
      // Batch create week plans
      const weekPlans = await tx.weeklyScheduleWeek.createManyAndReturn({
        data: weekPlansData
      })
    
      // Group assignments by lesson to support multiple lessons per week
      // First, we need to fetch assignments with topic and lesson data
      const assignmentsWithTopics = await tx.studentAssignment.findMany({
        where: {
          id: { in: assignments.map((a: any) => a.id) }
        },
        include: {
          topic: {
            include: {
              lesson: true
            }
          }
        }
      })
      
      const assignmentsByLesson: { [lessonId: string]: any[] } = {}
      assignmentsWithTopics.forEach((assignment: any) => {
        const lessonId = assignment.topic.lesson.id
        if (!assignmentsByLesson[lessonId]) {
          assignmentsByLesson[lessonId] = []
        }
        assignmentsByLesson[lessonId].push(assignment)
      })
      
      // Sort each lesson group by topic order (first topics first)
      Object.keys(assignmentsByLesson).forEach(lessonId => {
        assignmentsByLesson[lessonId].sort((a: any, b: any) => a.topic.order - b.topic.order)
      })
      
      // Get lesson groups (e.g., Math, Physics, Chemistry)
      const lessonGroups = Object.values(assignmentsByLesson)
      
      // Prepare all topics for batch insert
      const topicsToCreate = []
      const lessonGroupIndices: { [lessonId: string]: number } = {}
      
      for (let weekIndex = 0; weekIndex < weekPlans.length; weekIndex++) {
        const weekPlan = weekPlans[weekIndex]
        let topicOrder = 1
        
        // Add one topic from each lesson group to this week
        for (const lessonGroup of lessonGroups) {
          const lessonId = lessonGroup[0]?.topic?.lesson?.id
          if (lessonId) {
            const currentIndex = lessonGroupIndices[lessonId] || 0
            if (currentIndex < lessonGroup.length) {
              const assignment = lessonGroup[currentIndex]
              if (assignment) {
                topicsToCreate.push({
                  weekPlanId: weekPlan.id,
                  assignmentId: assignment.id,
                  topicOrder: topicOrder++
                })
                lessonGroupIndices[lessonId] = currentIndex + 1
              }
            }
          }
        }
      }
      
      // Batch insert all topics at once
      if (topicsToCreate.length > 0) {
        await tx.weeklyScheduleTopic.createMany({
          data: topicsToCreate
        })
      }
      
      return { schedule, weekPlans }
    })
    
    // Fetch the complete schedule with relations (outside transaction for better performance)
    const completeSchedule = await prisma.weeklySchedule.findUnique({
      where: { id: result.schedule.id },
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
    console.error('Error creating weekly schedule:', error)
    return NextResponse.json({
      error: 'Failed to create weekly schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
