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

    // For now, just return success without creating database records
    // TODO: Implement actual database storage when migration is complete
    console.log('Assignment request:', { studentId, topicIds })

    return NextResponse.json({ 
      message: 'Topics assigned successfully (temporary - not saved to database)',
      assignments: topicIds.length,
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
      // Get assignments for specific student
      // For now, return mock data since database table doesn't exist yet
      // TODO: Implement actual database query when migration is complete
      return NextResponse.json([
        {
          id: 'mock-assignment-1',
          studentId: studentId,
          topicId: 'mock-topic-1',
          assignedAt: new Date().toISOString(),
          completed: false
        }
      ])
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
