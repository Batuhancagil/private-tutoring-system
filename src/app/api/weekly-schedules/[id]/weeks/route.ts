import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/weekly-schedules/[id]/weeks - Get all weeks for a schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: scheduleId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const includeTopics = searchParams.get('includeTopics') === 'true'
    
    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }
    
    // Build include clause
    const includeClause: any = {}
    if (includeTopics) {
      includeClause.weekTopics = {
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
    
    const weeks = await prisma.weeklyScheduleWeek.findMany({
      where: { scheduleId },
      include: includeClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { weekNumber: 'asc' }
    })
    
    // Get total count
    const totalCount = await prisma.weeklyScheduleWeek.count({
      where: { scheduleId }
    })
    
    return NextResponse.json({
      weeks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch weeks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
