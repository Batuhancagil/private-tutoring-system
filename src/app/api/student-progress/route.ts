import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const assignmentId = searchParams.get('assignmentId')
    const topicId = searchParams.get('topicId')
    const resourceId = searchParams.get('resourceId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Build where clause dynamically
    const where: Record<string, string> = {}
    if (studentId) where.studentId = studentId
    if (assignmentId) where.assignmentId = assignmentId
    if (topicId) where.topicId = topicId
    if (resourceId) where.resourceId = resourceId

    // Get total count
    const totalCount = await prisma.studentProgress.count({
      where
    })

    // Get paginated data
    const progress = await prisma.studentProgress.findMany({
      where,
      skip,
      take: limit,
      include: {
        student: {
          select: { id: true, name: true }
        },
        assignment: {
          select: { id: true, topicId: true, assignedAt: true }
        },
        resource: {
          select: { id: true, name: true }
        },
        topic: {
          select: { id: true, name: true, order: true }
        }
      },
      orderBy: { lastSolvedAt: 'desc' }
    })

    return NextResponse.json({
      data: progress,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Get student progress error:', error)
    return NextResponse.json({
      error: 'Failed to fetch student progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { studentId, assignmentId, resourceId, topicId, solvedCount, totalCount } = await request.json()

    if (!studentId || !assignmentId || !resourceId || !topicId) {
      return NextResponse.json({ 
        error: 'studentId, assignmentId, resourceId, and topicId are required' 
      }, { status: 400 })
    }

    // Check if progress record already exists
    const existingProgress = await prisma.studentProgress.findUnique({
      where: {
        studentId_assignmentId_resourceId: {
          studentId,
          assignmentId,
          resourceId
        }
      }
    })

    let progress
    if (existingProgress) {
      // Update existing progress
      progress = await prisma.studentProgress.update({
        where: { id: existingProgress.id },
        data: {
          solvedCount: solvedCount ?? existingProgress.solvedCount,
          totalCount: totalCount ?? existingProgress.totalCount,
          lastSolvedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          student: { select: { id: true, name: true } },
          assignment: { select: { id: true, topicId: true } },
          resource: { select: { id: true, name: true } },
          topic: { select: { id: true, name: true } }
        }
      })
    } else {
      // Create new progress record
      progress = await prisma.studentProgress.create({
        data: {
          studentId,
          assignmentId,
          resourceId,
          topicId,
          solvedCount: solvedCount ?? 0,
          totalCount: totalCount ?? 0,
          lastSolvedAt: new Date()
        },
        include: {
          student: { select: { id: true, name: true } },
          assignment: { select: { id: true, topicId: true } },
          resource: { select: { id: true, name: true } },
          topic: { select: { id: true, name: true } }
        }
      })
    }

    return NextResponse.json(progress, { status: 201 })
  } catch (error) {
    console.error('Student progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to update student progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
