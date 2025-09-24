import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const progress = await prisma.studentProgress.findUnique({
      where: { id },
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
      }
    })

    if (!progress) {
      return NextResponse.json({ error: 'Progress not found' }, { status: 404 })
    }

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { solvedCount, totalCount } = await request.json()
    
    if (solvedCount === undefined && totalCount === undefined) {
      return NextResponse.json({ error: 'solvedCount or totalCount is required' }, { status: 400 })
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    }
    
    if (solvedCount !== undefined) updateData.solvedCount = solvedCount
    if (totalCount !== undefined) updateData.totalCount = totalCount
    if (solvedCount !== undefined) updateData.lastSolvedAt = new Date()

    const progress = await prisma.studentProgress.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, name: true } },
        assignment: { select: { id: true, topicId: true } },
        resource: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(progress)
  } catch (error) {
    console.error('Update progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to update progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.studentProgress.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
