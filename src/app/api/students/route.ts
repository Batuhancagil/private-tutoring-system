import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createStudentSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createErrorResponse } from '@/lib/error-handler'

export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    // Get total count
    const totalCount = await prisma.student.count({
      where: { userId: user.id }
    })

    // Get paginated data
    const students = await prisma.student.findMany({
      where: {
        userId: user.id
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return createSuccessResponse({
      data: students,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    return handleAPIError(error, 'Students fetch')
  }
}

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

    const { name, email, phone, parentName, parentPhone, notes, password } = validation.data

    if (email && !password) {
      return createErrorResponse('E-posta belirtildiğinde şifre de zorunludur', 400)
    }

    // Şifreyi hash'le
    const hashedPassword = password ? await hashPassword(password) : null

    const student = await prisma.student.create({
      data: {
        name,
        email: email || null,
        password: hashedPassword,
        phone: phone || null,
        parentName: parentName || null,
        parentPhone: parentPhone || null,
        notes: notes || null,
        userId: user.id
      }
    })

    return createSuccessResponse(student, 201)
  } catch (error) {
    return handleAPIError(error, 'Student creation')
  }
}
