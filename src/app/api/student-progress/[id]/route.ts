import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { id } = await params
    
    const progress = await prisma.studentProgress.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, name: true }
        },
        studentAssignment: {  // assignment → studentAssignment
          select: { id: true, lessonTopicId: true, assignedAt: true }  // topicId → lessonTopicId
        },
        resource: {
          select: { id: true, resourceName: true }  // name → resourceName
        },
        lessonTopic: {  // topic → lessonTopic
          select: { id: true, lessonTopicName: true, lessonTopicOrder: true }  // name → lessonTopicName, order → lessonTopicOrder
        }
      }
    })

    if (!progress) {
      return NextResponse.json({ error: 'Progress not found' }, { status: 404 })
    }

    const successResponse = NextResponse.json(progress)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
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
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { id } = await params
    const body = await request.json()

    // Validate at least one field is provided and all fields are valid numbers
    const updateSchema = z.object({
      solvedCount: z.number().int().min(0).optional(),
      correctCount: z.number().int().min(0).optional(),
      wrongCount: z.number().int().min(0).optional(),
      emptyCount: z.number().int().min(0).optional()
    }).refine(data =>
      data.solvedCount !== undefined ||
      data.correctCount !== undefined ||
      data.wrongCount !== undefined ||
      data.emptyCount !== undefined,
      { message: 'At least one count field is required' }
    )

    const validation = updateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validation.error.format()
      }, { status: 400 })
    }

    const { solvedCount, correctCount, wrongCount, emptyCount } = validation.data

    const updateData: Record<string, any> = {
      updatedAt: new Date()
    }

    // Field names updated to match new schema
    if (solvedCount !== undefined) updateData.studentProgressSolvedCount = solvedCount
    if (correctCount !== undefined) updateData.studentProgressCorrectCount = correctCount
    if (wrongCount !== undefined) updateData.studentProgressWrongCount = wrongCount
    if (emptyCount !== undefined) updateData.studentProgressEmptyCount = emptyCount
    if (solvedCount !== undefined) updateData.studentProgressLastSolvedAt = new Date()

    const progress = await prisma.studentProgress.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, name: true } },
        studentAssignment: { select: { id: true, lessonTopicId: true } },  // assignment → studentAssignment, topicId → lessonTopicId
        resource: { select: { id: true, resourceName: true } },  // name → resourceName
        lessonTopic: { select: { id: true, lessonTopicName: true } }  // topic → lessonTopic, name → lessonTopicName
      }
    })

    const successResponse = NextResponse.json(progress)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
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
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireAuth()
    if (!user) return response

    const { id } = await params

    await prisma.studentProgress.delete({
      where: { id }
    })

    const successResponse = NextResponse.json({ success: true })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    console.error('Delete progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
