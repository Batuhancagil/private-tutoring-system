import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createTopicSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 })
    }

    const topics = await prisma.topic.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' }
    })

    const topicsWithQuestionCount = topics.map(topic => ({
      ...topic,
      questionCount: 0
    }))

    return NextResponse.json(topicsWithQuestionCount)
  } catch (error) {
    console.error('Topics fetch error:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const body = await request.json()

    // If order is not provided, calculate it automatically
    if (!body.order) {
      const existingTopicsCount = await prisma.topic.count({
        where: { lessonId: body.lessonId }
      })
      body.order = existingTopicsCount + 1
    }

    // Validate request body
    const validation = validateRequest(createTopicSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
    }

    const { lessonId, name, order } = validation.data

    const topic = await prisma.topic.create({
      data: {
        name,
        order,
        lessonId
      }
    })

    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    console.error('Topic creation error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({
      error: 'Failed to create topic',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
