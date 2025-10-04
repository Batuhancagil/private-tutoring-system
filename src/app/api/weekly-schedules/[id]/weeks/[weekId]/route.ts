import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/weekly-schedules/[id]/weeks/[weekId] - Get single week details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, weekId: string } }
) {
  try {
    const { weekId } = params
    
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
      }
    })
    
    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 })
    }
    
    return NextResponse.json(week, { status: 200 })
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
  { params }: { params: { id: string, weekId: string } }
) {
  try {
    const { weekId } = params
    const body = await request.json()
    const { startDate, endDate, weekTopics } = body
    
    if (!weekId) {
      return NextResponse.json({ error: 'Week ID is required' }, { status: 400 })
    }
    
    // Use transaction to update week and topics
    const result = await prisma.$transaction(async (tx) => {
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
      }
    })
    
    return NextResponse.json(updatedWeekWithTopics, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update week',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
