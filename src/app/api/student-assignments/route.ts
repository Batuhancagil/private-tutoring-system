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

    // Validate topics exist
    const topicsInDb = await prisma.topic.findMany({
      where: { id: { in: topicIds } },
      select: { id: true }
    })
    const validTopicIdSet = new Set(topicsInDb.map(t => t.id))
    const invalidTopicIds = topicIds.filter(id => !validTopicIdSet.has(id))

    if (invalidTopicIds.length > 0) {
      return NextResponse.json({ 
        error: 'Some topics not found',
        invalidTopicIds
      }, { status: 400 })
    }

    // Delete all existing assignments for this student
    const deletedCount = await prisma.studentAssignment.deleteMany({
      where: { studentId }
    })
    console.log('🗑️ Deleted existing assignments:', deletedCount.count)

    // Create new assignments
    const assignments = [] as Array<{ id: string; topicId: string }>
    const perTopicResults: Array<{ topicId: string; status: 'created' | 'error'; error?: string }> = []

    for (const topicId of topicIds) {
      try {
        const assignment = await prisma.studentAssignment.create({
          data: {
            studentId,
            topicId,
            assignedAt: new Date(),
            completed: false
          },
          select: { id: true, topicId: true }
        })
        assignments.push(assignment)
        perTopicResults.push({ topicId, status: 'created' })
        console.log('✅ Created assignment:', assignment.id, 'for topic:', topicId)
      } catch (assignmentError) {
        console.error('❌ Error creating assignment for topic:', topicId, assignmentError)
        perTopicResults.push({ topicId, status: 'error', error: assignmentError instanceof Error ? assignmentError.message : 'Unknown error' })
      }
    }

    console.log('📊 Assignment Summary:')
    console.log('- Deleted existing assignments:', deletedCount.count)
    console.log('- Total requested topics:', topicIds.length)
    console.log('- Created new assignments:', assignments.length)

    // Verify assignments were created
    const totalAssignments = await prisma.studentAssignment.count({ where: { studentId } })
    console.log('Total assignments for student after creation:', totalAssignments)

    return NextResponse.json({ 
      message: 'Topics assigned successfully',
      assignments: assignments.length,
      studentId,
      topicIds,
      totalAssignments,
      debug: {
        tableExists: true,
        deletedCount: deletedCount.count,
        perTopicResults,
        createdAssignments: assignments,
        allAssignments: await prisma.studentAssignment.findMany({
          where: { studentId },
          select: { id: true, topicId: true, assignedAt: true }
        }),
        summary: {
          deleted: deletedCount.count,
          requested: topicIds.length,
          created: assignments.length,
          totalAfter: totalAssignments
        }
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

    // Minimal query: no includes, no counts, no distinct
    const assignments = await prisma.studentAssignment.findMany({
      where: { studentId },
      select: { id: true, studentId: true, topicId: true, assignedAt: true, completed: true },
      orderBy: { assignedAt: 'desc' }
    })

    console.log('Found assignments (minimal) for student:', studentId, assignments.length)
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Get assignments error (minimal):', error)
    return NextResponse.json({ 
      error: 'Failed to fetch assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
