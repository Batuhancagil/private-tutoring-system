import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { studentId, topicIds } = await request.json()
    
    console.log('POST /api/student-assignments called with:', { studentId, topicIds })
    
    if (!studentId || !topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json({ 
        error: 'Student ID and topic IDs are required' 
      }, { status: 400 })
    }

    // Mock response for now
    return NextResponse.json({ 
      message: 'Topics assigned successfully (mock)',
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

    console.log('GET /api/student-assignments called with studentId:', studentId)

    // Mock response for now
    return NextResponse.json([])

  } catch (error) {
    console.error('Get assignments error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
