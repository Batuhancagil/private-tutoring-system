import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Order, name veya questionCount güncellemesi
    if (body.order !== undefined) {
      const topic = await prisma.topic.update({
        where: { id },
        data: { order: parseInt(body.order) }
      })
      return NextResponse.json(topic)
    } else if (body.name) {
      const topic = await prisma.topic.update({
        where: { id },
        data: { name: body.name }
      })
      return NextResponse.json(topic)
    } else if (body.questionCount !== undefined) {
      // Geçici olarak sadece response döndür, database güncellemesi yapma
      return NextResponse.json({ 
        id, 
        questionCount: parseInt(body.questionCount) || 0,
        message: 'Question count updated (temporary - database not updated)'
      })
    } else {
      return NextResponse.json({ error: 'Order, name or questionCount is required' }, { status: 400 })
    }
  } catch (error) {
    console.error('Topic update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update topic',
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

    await prisma.topic.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Topic delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete topic',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
