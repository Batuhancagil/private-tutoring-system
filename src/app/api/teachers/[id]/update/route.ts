import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { handleAPIError, createSuccessResponse, createValidationErrorResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Validation schema for updating a teacher
const updateTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  subscriptionEndDate: z.string().optional(),
  password: z.string().optional()
})

/**
 * PUT /api/teachers/[id]/update
 * Update a teacher (Super Admin only)
 *
 * @body name - Teacher name (optional)
 * @body email - Teacher email (optional)
 * @body subscriptionEndDate - Subscription end date (optional)
 * @body password - New password (optional, only updates if provided and not empty)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params
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

    const { name, email, subscriptionEndDate, password } = validation.data

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

    // Prepare update data
    const updateData: any = {}

    // Add fields to update data if provided
    if (name !== undefined) {
      updateData.name = name
    }
    if (email !== undefined) {
      updateData.email = email
    }
    if (subscriptionEndDate !== undefined) {
      updateData.subscriptionEndDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null
    }

    // Handle password update - only if provided and not empty
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }
      const hashedPassword = await bcrypt.hash(password, 12)
      updateData.password = hashedPassword
      console.log(`Password updated for teacher ${existingTeacher.name}`)
    }

    // Check if email is already taken by another user (only if email is being updated)
    if (email !== undefined) {
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
    }

    // Update the teacher
    const updatedTeacher = await prisma.user.update({
      where: { id: teacherId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        subscriptionEndDate: true,
      }
    })

    // Add subscription status calculation
    const now = new Date()
    const subscriptionEnd = updatedTeacher.subscriptionEndDate ? new Date(updatedTeacher.subscriptionEndDate) : null
    const isSubscriptionActive = !subscriptionEnd || subscriptionEnd > now
    
    console.log(`Updated teacher ${updatedTeacher.name}: subscriptionEnd=${subscriptionEnd}, now=${now}, isActive=${isSubscriptionActive}`)
    
    const teacherWithStatus = {
      ...updatedTeacher,
      isSubscriptionActive
    }

    const successResponse = createSuccessResponse(
      {
        message: 'Teacher updated successfully',
        teacher: teacherWithStatus
      },
      200
    )

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Teacher update')
  }
}
