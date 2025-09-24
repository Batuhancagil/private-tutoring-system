import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { studentId, assignmentId, resourceId, topicId, increment = 1 } = await request.json()
    
    console.log('POST /api/student-progress/increment called with:', { studentId, assignmentId, resourceId, topicId, increment })
    
    if (!studentId || !assignmentId || !resourceId || !topicId) {
      return NextResponse.json({ 
        error: 'studentId, assignmentId, resourceId, and topicId are required' 
      }, { status: 400 })
    }

    // Check if progress record exists
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
      // Update existing progress with increment
      progress = await prisma.studentProgress.update({
        where: { id: existingProgress.id },
        data: {
          solvedCount: { increment },
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
      console.log('✅ Incremented existing progress:', progress.id, 'new count:', progress.solvedCount)
    } else {
      // Create new progress record with initial count
      progress = await prisma.studentProgress.create({
        data: {
          studentId,
          assignmentId,
          resourceId,
          topicId,
          solvedCount: increment,
          totalCount: 0, // Will be updated when assignment is made
          lastSolvedAt: new Date()
        },
        include: {
          student: { select: { id: true, name: true } },
          assignment: { select: { id: true, topicId: true } },
          resource: { select: { id: true, name: true } },
          topic: { select: { id: true, name: true } }
        }
      })
      console.log('✅ Created new progress with increment:', progress.id, 'count:', progress.solvedCount)
    }

    return NextResponse.json(progress, { status: 201 })
  } catch (error) {
    console.error('Increment progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to increment student progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
