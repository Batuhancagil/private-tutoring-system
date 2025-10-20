import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { validateRequest, updateStudentSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createNotFoundResponse, createErrorResponse } from '@/lib/error-handler'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'

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

    const student = await prisma.student.findUnique({
      where: { id }
    })

    if (!student) {
      return createNotFoundResponse('Student')
    }

    if (student.teacherId !== user.id) {  // userId → teacherId
      return createErrorResponse('Unauthorized', 401)
    }

    const successResponse = createSuccessResponse(student)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.LENIENT)
  } catch (error) {
    return handleAPIError(error, 'Student fetch')
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

    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = validateRequest(updateStudentSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { name, email, phone, parentName, parentPhone, notes, password } = validation.data

    // E-posta varsa ama şifre boşsa, mevcut öğrenciyi kontrol et
    if (email && !password) {
      const existingStudent = await prisma.student.findUnique({
        where: { id },
        select: { password: true }
      })

      // Eğer öğrencinin mevcut şifresi yoksa, yeni şifre zorunlu
      if (!existingStudent?.password) {
        return createErrorResponse('E-posta belirtildiğinde şifre de zorunludur', 400)
      }
    }

    // Şifreyi hash'le (eğer verilmişse)
    const hashedPassword = password ? await hashPassword(password) : undefined

    const updateData: {
      name?: string
      email?: string  // Email is required in schema, so can't be null
      phone?: string | null
      parentName?: string | null
      parentPhone?: string | null
      notes?: string | null
      password?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email  // Email is required, don't set to null
    if (phone !== undefined) updateData.phone = phone || null
    if (parentName !== undefined) updateData.parentName = parentName || null
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone || null
    if (notes !== undefined) updateData.notes = notes || null
    if (hashedPassword !== undefined) updateData.password = hashedPassword

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData
    })

    const successResponse = createSuccessResponse(updatedStudent)

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Student update')
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

    const { id } = await params

    await prisma.student.delete({
      where: { id }
    })

    const successResponse = createSuccessResponse({ success: true })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Student deletion')
  }
}
