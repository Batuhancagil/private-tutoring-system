import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

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
    const { name, email, phone, parentName, parentPhone, notes, password } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

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
      name: string
      email: string | null
      phone: string | null
      parentName: string | null
      parentPhone: string | null
      notes: string | null
      password?: string
    } = {
      name,
      email: email || null,
      phone: phone || null,
      parentName: parentName || null,
      parentPhone: parentPhone || null,
      notes: notes || null
    }

    if (hashedPassword !== undefined) {
      updateData.password = hashedPassword
    }

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
