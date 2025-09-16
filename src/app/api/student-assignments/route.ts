import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { studentId, topicIds } = await request.json()
    
    console.log('POST /api/student-assignments called with:', { studentId, topicIds })
    
    if (!studentId || !topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json({ 
        error: 'Student ID and topic IDs are required' 
      }, { status: 400 })
    }

    // Create assignments in database
    const assignments = []
    for (const topicId of topicIds) {
      try {
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
          console.log('Created assignment:', assignment.id)
        } else {
          assignments.push(existingAssignment)
          console.log('Assignment already exists:', existingAssignment.id)
        }
      } catch (assignmentError) {
        console.error('Error creating assignment for topic:', topicId, assignmentError)
        // Continue with other topics
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

    console.log('GET /api/student-assignments called with studentId:', studentId)

    if (studentId) {
      try {
        // Get assignments for specific student
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
      } catch (dbError) {
        console.error('Database error:', dbError)
        // Return empty array if database error
        return NextResponse.json([])
      }
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
