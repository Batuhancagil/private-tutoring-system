import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { order } = await request.json()
    
    if (order === undefined) {
      return NextResponse.json({ error: 'Order is required' }, { status: 400 })
    }

    const topic = await prisma.topic.update({
      where: { id },
      data: { order: parseInt(order) }
    })

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Topic update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update topic order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
