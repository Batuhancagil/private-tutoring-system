import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createTopicSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createErrorResponse } from '@/lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return createErrorResponse('Lesson ID is required', 400)
    }

    const topics = await prisma.lessonTopic.findMany({  // topic → lessonTopic
      where: { lessonId },
      orderBy: { lessonTopicOrder: 'asc' }  // order → lessonTopicOrder
    })

    const topicsWithQuestionCount = topics.map(topic => ({
      ...topic,
      questionCount: 0
    }))

    return createSuccessResponse(topicsWithQuestionCount)
  } catch (error) {
    return handleAPIError(error, 'Topics fetch')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const body = await request.json()

    // If order is not provided, calculate it automatically
    if (!body.order) {
      const existingTopicsCount = await prisma.lessonTopic.count({  // topic → lessonTopic
        where: { lessonId: body.lessonId }
      })
      body.order = existingTopicsCount + 1
    }

    // Validate request body
    const validation = validateRequest(createTopicSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { lessonId, name, order } = validation.data

    const topic = await prisma.lessonTopic.create({  // topic → lessonTopic
      data: {
        lessonTopicName: name,  // name → lessonTopicName
        lessonTopicOrder: order,  // order → lessonTopicOrder
        lessonId
      }
    })

    return createSuccessResponse(topic, 201)
  } catch (error) {
    return handleAPIError(error, 'Topic creation')
  }
}
