import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import jwt from 'jsonwebtoken'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { validateRequest, studentLoginSchema } from '@/lib/validations'
import { createValidationErrorResponse } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - auth preset for login attempts
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.AUTH)
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const body = await request.json()

    // Validate request body
    const validation = validateRequest(studentLoginSchema, body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    const { email, password } = validation.data

    // Öğrenciyi e-posta ile bul
    const student = await prisma.student.findUnique({
      where: { email }
    })

    if (!student) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya şifre' }, { status: 401 })
    }

    if (!student.password) {
      return NextResponse.json({ error: 'Bu öğrenci için şifre belirlenmemiş' }, { status: 401 })
    }

    // Şifreyi doğrula
    const isValidPassword = await verifyPassword(password, student.password)
    
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya şifre' }, { status: 401 })
    }

    // JWT token oluştur
    const token = jwt.sign(
      { 
        studentId: student.id, 
        email: student.email,
        name: student.name,
        type: 'student'
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    const successResponse = NextResponse.json({
      success: true,
      token,
      student: {
        id: student.id,
        name: student.name,
        email: student.email
      }
    })

    return addRateLimitHeaders(successResponse, request, RateLimitPresets.AUTH)
  } catch (error) {
    console.error('Student login error:', error)
    return NextResponse.json({ 
      error: 'Giriş sırasında hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
