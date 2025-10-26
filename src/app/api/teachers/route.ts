import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { handleAPIError, createSuccessResponse, createValidationErrorResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// Validation schema for creating a teacher
const createTeacherSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  subscriptionEndDate: z.string().optional(),
})

/**
 * POST /api/teachers
 * Create a new teacher (Super Admin only)
 *
 * @body name - Teacher name (required)
 * @body email - Teacher email (required)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validate request body
    const validation = createTeacherSchema.safeParse(body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error.format())
    }

    const { name, email, password, subscriptionEndDate } = validation.data

    // Check if teacher with this email already exists
    const existingTeacher = await prisma.user.findUnique({
      where: { email }
    })

    if (existingTeacher) {
      return NextResponse.json(
        { error: 'A teacher with this email already exists' },
        { status: 409 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Parse subscription end date if provided
    const subscriptionDate = subscriptionEndDate ? new Date(subscriptionEndDate) : null

    // Create the teacher
    const teacher = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        subscriptionEndDate: subscriptionDate,
      },
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

    // Add subscription status calculation for the created teacher
    const now = new Date()
    const subscriptionEnd = teacher.subscriptionEndDate ? new Date(teacher.subscriptionEndDate) : null
    const isSubscriptionActive = !subscriptionEnd || subscriptionEnd > now
    
    const teacherWithStatus = {
      ...teacher,
      isSubscriptionActive
    }

    const successResponse = createSuccessResponse(
      {
        message: 'Teacher created successfully',
        teacher: teacherWithStatus
      },
      201
    )

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Teacher creation')
  }
}

/**
 * GET /api/teachers
 * Get all teachers (Super Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting - lenient for read operations
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.LENIENT)
    if (rateLimitResponse) return rateLimitResponse

    // Super admin authentication required
    const { user, response } = await requireSuperAdmin()
    if (!user) return response

    // Fetch all teachers
    const teachers = await prisma.user.findMany({
      where: {
        role: 'TEACHER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        subscriptionEndDate: true,
        _count: {
          select: {
            students: true,
            lessons: true,
            resources: true,
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Add subscription status calculation
    const teachersWithStatus = teachers.map(teacher => {
      const now = new Date()
      const subscriptionEnd = teacher.subscriptionEndDate ? new Date(teacher.subscriptionEndDate) : null
      const isSubscriptionActive = !subscriptionEnd || subscriptionEnd > now
      
      console.log(`Teacher ${teacher.name}: subscriptionEnd=${subscriptionEnd}, now=${now}, isActive=${isSubscriptionActive}`)
      
      return {
        ...teacher,
        isSubscriptionActive
      }
    })

    const successResponse = createSuccessResponse({
      teachers: teachersWithStatus,
      total: teachersWithStatus.length
    })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return handleAPIError(error, 'Teachers fetch')
  }
}
