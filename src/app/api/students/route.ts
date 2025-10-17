import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createStudentSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createErrorResponse } from '@/lib/error-handler'

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const students = await prisma.student.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return createSuccessResponse(students)
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
