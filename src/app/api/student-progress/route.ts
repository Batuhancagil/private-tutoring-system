import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const assignmentId = searchParams.get('assignmentId')
    const topicId = searchParams.get('topicId')
    const resourceId = searchParams.get('resourceId')

    console.log('GET /api/student-progress called with:', { studentId, assignmentId, topicId, resourceId })

    // Build where clause dynamically
    const where: any = {}
    if (studentId) where.studentId = studentId
    if (assignmentId) where.assignmentId = assignmentId
    if (topicId) where.topicId = topicId
    if (resourceId) where.resourceId = resourceId

    const progress = await prisma.studentProgress.findMany({
      where,
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

    console.log('Found progress records:', progress.length)
    return NextResponse.json(progress)
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
    
    console.log('POST /api/student-progress called with:', { studentId, assignmentId, resourceId, topicId, solvedCount, totalCount })
    
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
      console.log('✅ Updated existing progress:', progress.id)
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
      console.log('✅ Created new progress:', progress.id)
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
