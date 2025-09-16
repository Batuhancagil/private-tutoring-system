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

    // First, let's check if the table exists by trying to count records
    try {
      const tableExists = await prisma.studentAssignment.count()
      console.log('Student assignments table exists, current count:', tableExists)
    } catch (tableError) {
      console.error('Table might not exist:', tableError)
      return NextResponse.json({ 
        error: 'Database table not found',
        details: tableError instanceof Error ? tableError.message : 'Unknown error'
      }, { status: 500 })
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
          console.log('Created assignment:', assignment.id, 'for topic:', topicId)
        } else {
          assignments.push(existingAssignment)
          console.log('Assignment already exists:', existingAssignment.id, 'for topic:', topicId)
        }
      } catch (assignmentError) {
        console.error('Error creating assignment for topic:', topicId, assignmentError)
        // Continue with other topics
      }
    }

    // Verify assignments were created
    const totalAssignments = await prisma.studentAssignment.count({
      where: { studentId }
    })
    console.log('Total assignments for student after creation:', totalAssignments)

    return NextResponse.json({ 
      message: 'Topics assigned successfully',
      assignments: assignments.length,
      studentId,
      topicIds,
      totalAssignments
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
        // First check if table exists and count total records
        const totalRecords = await prisma.studentAssignment.count()
        console.log('Total student assignments in database:', totalRecords)

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
        console.log('Assignment details:', assignments.map(a => ({
          id: a.id,
          studentId: a.studentId,
          topicId: a.topicId,
          topicName: a.topic?.name,
          lessonName: a.topic?.lesson?.name
        })))

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
