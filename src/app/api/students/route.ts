import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { requireAuth } from '@/lib/auth-helpers'
import { validateRequest, createStudentSchema } from '@/lib/validations'

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

    return NextResponse.json(students)
  } catch (error) {
    console.error('Students fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch students',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
      return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
    }

    const { name, email, phone, parentName, parentPhone, notes, password } = validation.data

    if (email && !password) {
      return NextResponse.json({ error: 'E-posta belirtildiğinde şifre de zorunludur' }, { status: 400 })
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

    return NextResponse.json(student, { status: 201 })
  } catch (error) {
    console.error('Student creation error:', error)
    return NextResponse.json({
      error: 'Failed to create student',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
