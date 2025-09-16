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
      totalAssignments,
      debug: {
        tableExists: true,
        createdAssignments: assignments.map(a => ({ id: a.id, topicId: a.topicId })),
        allAssignments: await prisma.studentAssignment.findMany({
          where: { studentId },
          select: { id: true, topicId: true, assignedAt: true }
        })
      }
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

    if (!studentId) {
      return NextResponse.json([])
    }

    // First check if table exists and count total records
    const totalRecords = await prisma.studentAssignment.count()
    console.log('Total student assignments in database:', totalRecords)

    // Get all unique student IDs to see what's in the database
    const allStudentIds = await prisma.studentAssignment.findMany({
      select: { studentId: true },
      distinct: ['studentId']
    })
    console.log('All student IDs in database:', allStudentIds.map(s => s.studentId))

    try {
      // Preferred: detailed include query
      const assignmentsWithRelations = await prisma.studentAssignment.findMany({
        where: { studentId },
        include: { topic: { include: { lesson: true } } },
        orderBy: { assignedAt: 'desc' }
      })

      console.log('Found assignments (with relations) for student:', studentId, assignmentsWithRelations.length)
      return NextResponse.json(assignmentsWithRelations)
    } catch (includeError) {
      console.error('Include query failed, falling back to simple query:', includeError)
      // Fallback: simple records without relations
      const simpleAssignments = await prisma.studentAssignment.findMany({
        where: { studentId },
        orderBy: { assignedAt: 'desc' }
      })
      console.log('Found assignments (simple) for student:', studentId, simpleAssignments.length)
      return NextResponse.json(simpleAssignments)
    }
  } catch (error) {
    console.error('Get assignments error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
