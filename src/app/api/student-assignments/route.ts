import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { studentId, topicIds } = await request.json()
    
    if (!studentId || !topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json({ 
        error: 'Student ID and topic IDs are required' 
      }, { status: 400 })
    }

    // Verify student exists
    const student = await prisma.student.findFirst({
      where: { 
        id: studentId
      }
    })

    if (!student) {
      return NextResponse.json({ 
        error: 'Student not found' 
      }, { status: 404 })
    }

    // Verify topics exist
    const topics = await prisma.topic.findMany({
      where: { id: { in: topicIds } }
    })

    if (topics.length !== topicIds.length) {
      return NextResponse.json({ 
        error: 'Some topics not found' 
      }, { status: 404 })
    }

    // Create assignments
    const assignments = await Promise.all(
      topicIds.map(topicId => 
        prisma.studentAssignment.create({
          data: {
            studentId,
            topicId,
            assignedAt: new Date(),
            completed: false
          }
        })
      )
    )

    return NextResponse.json({ 
      message: 'Topics assigned successfully',
      assignments: assignments.length
    }, { status: 201 })

  } catch (error) {
    console.error('Student assignment error:', error)
    return NextResponse.json({ 
      error: 'Failed to assign topics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Get all assignments
    const assignments = await prisma.studentAssignment.findMany({
      include: {
        student: true,
        topic: {
          include: {
            lesson: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    })

    return NextResponse.json(assignments)

  } catch (error) {
    console.error('Get assignments error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
