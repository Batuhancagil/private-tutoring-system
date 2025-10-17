import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createStudentSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse } from '@/lib/error-handler'
import { studentService } from '@/services'

/**
 * GET /api/students
 * Get all students for the authenticated user with pagination
 *
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Use service layer for business logic
    const result = await studentService.getStudentsByUser(user.id, page, limit)

    return createSuccessResponse({
      data: result.students,
      pagination: result.pagination
    })
  } catch (error) {
    return handleAPIError(error, 'Students fetch')
  }
}

/**
 * POST /api/students
 * Create a new student
 *
 * @body name - Student name (required)
 * @body email - Student email (optional)
 * @body password - Password for student login (required if email provided)
 * @body phone - Student phone (optional)
 * @body parentName - Parent name (optional)
 * @body parentPhone - Parent phone (optional)
 * @body notes - Additional notes (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const body = await request.json()

    // Validate request body
    const validation = validateRequest(createStudentSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    // Use service layer for business logic
    const student = await studentService.createStudent(user.id, validation.data)

    return createSuccessResponse(student, 201)
  } catch (error) {
    return handleAPIError(error, 'Student creation')
  }
}
