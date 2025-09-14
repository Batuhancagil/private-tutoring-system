import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const student = await prisma.student.findUnique({
      where: { id }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Demo için session kontrolünü gevşetiyoruz
    if (!session && student.userId !== 'demo-user-id') {
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
    const { name, email, phone, parentName, parentPhone, notes } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        parentName: parentName || null,
        parentPhone: parentPhone || null,
        notes: notes || null
      }
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
