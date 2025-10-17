import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { validateRequest, updateStudentSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const { id } = await params

    const student = await prisma.student.findUnique({
      where: { id }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (student.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(student)
  } catch (error) {
    console.error('Student fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch student',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validate request body
    const validation = validateRequest(updateStudentSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
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
        return NextResponse.json({ error: 'E-posta belirtildiğinde şifre de zorunludur' }, { status: 400 })
      }
    }

    // Şifreyi hash'le (eğer verilmişse)
    const hashedPassword = password ? await hashPassword(password) : undefined

    const updateData: {
      name?: string
      email?: string | null
      phone?: string | null
      parentName?: string | null
      parentPhone?: string | null
      notes?: string | null
      password?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email || null
    if (phone !== undefined) updateData.phone = phone || null
    if (parentName !== undefined) updateData.parentName = parentName || null
    if (parentPhone !== undefined) updateData.parentPhone = parentPhone || null
    if (notes !== undefined) updateData.notes = notes || null
    if (hashedPassword !== undefined) updateData.password = hashedPassword

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updatedStudent)
  } catch (error) {
    console.error('Student update error:', error)
    return NextResponse.json({
      error: 'Failed to update student',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.student.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Student delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete student',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
