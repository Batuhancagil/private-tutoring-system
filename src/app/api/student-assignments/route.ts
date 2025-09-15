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

    // Create assignments in database
    const assignments = []
    for (const topicId of topicIds) {
      // Check if assignment already exists
      const existingAssignment = await prisma.studentAssignment.findUnique({
        where: {
          studentId_topicId: {
            studentId: studentId,
            topicId: topicId
          }
        }
      })

      if (!existingAssignment) {
        const assignment = await prisma.studentAssignment.create({
          data: {
            studentId,
            topicId,
            assignedAt: new Date(),
            completed: false
          }
        })
        assignments.push(assignment)
      }
    }

    return NextResponse.json({ 
      message: 'Topics assigned successfully',
      assignments: assignments.length,
      studentId,
      topicIds
    }, { status: 201 })

  } catch (error) {
    console.error('Student assignment error:', error)
    return NextResponse.json({ 
      error: 'Failed to assign topics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (studentId) {
      // Get assignments for specific student from database
      const assignments = await prisma.studentAssignment.findMany({
        where: {
          studentId: studentId
        },
        include: {
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

      console.log('Found assignments for student:', studentId, assignments.length)
      return NextResponse.json(assignments)
    }

    // Return empty array for all assignments
    return NextResponse.json([])

  } catch (error) {
    console.error('Get assignments error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
