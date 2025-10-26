import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { handleAPIError, createSuccessResponse, createValidationErrorResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for updating a teacher
const updateTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
})

/**
 * PUT /api/teachers/[id]
 * Update a teacher (Super Admin only)
 *
 * @body name - Teacher name (required)
 * @body email - Teacher email (required)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    // Super admin authentication required
    const { user, response } = await requireSuperAdmin()
    if (!user) return response

    const teacherId = params.id
    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate request body
    const validation = updateTeacherSchema.safeParse(body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error.format())
    }

    const { name, email } = validation.data

    // Check if teacher exists
    const existingTeacher = await prisma.user.findUnique({
      where: { 
        id: teacherId,
        role: 'TEACHER'
      }
    })

    if (!existingTeacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Check if email is already taken by another user
    const emailConflict = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: teacherId }
      }
    })

    if (emailConflict) {
      return NextResponse.json(
        { error: 'Email is already taken by another user' },
        { status: 409 }
      )
    }

    // Update the teacher
    const updatedTeacher = await prisma.user.update({
      where: { id: teacherId },
      data: {
        name,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    })

    const successResponse = createSuccessResponse(
      {
        message: 'Teacher updated successfully',
        teacher: updatedTeacher
      },
      200
    )

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Teacher update')
  }
}

/**
 * DELETE /api/teachers/[id]
 * Delete a teacher (Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting - strict for write operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    // Super admin authentication required
    const { user, response } = await requireSuperAdmin()
    if (!user) return response

    const teacherId = params.id
    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    // Check if teacher exists
    const existingTeacher = await prisma.user.findUnique({
      where: { 
        id: teacherId,
        role: 'TEACHER'
      }
    })

    if (!existingTeacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Delete the teacher
    await prisma.user.delete({
      where: { id: teacherId }
    })

    const successResponse = createSuccessResponse(
      {
        message: 'Teacher deleted successfully'
      },
      200
    )

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Teacher deletion')
  }
}
