import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Demo için session kontrolünü gevşetiyoruz
    if (!session) {
      return NextResponse.json([])
    }

    const students = await prisma.student.findMany({
      where: {
        userId: session.user?.id || 'demo-user-id'
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
    const session = await getServerSession(authOptions)
    
    // Demo için session kontrolünü gevşetiyoruz
    if (!session) {
      // Demo user oluştur veya bul
      let demoUser = await prisma.user.findFirst({
        where: { email: 'admin@example.com' }
      })
      
      if (!demoUser) {
        demoUser = await prisma.user.create({
          data: {
            id: 'demo-user-id',
            email: 'admin@example.com',
            name: 'Demo User'
          }
        })
      }
    }

    const { name, email, phone, parentName, parentPhone, notes } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Öğrenci adı zorunludur' }, { status: 400 })
    }

    const userId = session?.user?.id || 'demo-user-id'

    const student = await prisma.student.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        parentName: parentName || null,
        parentPhone: parentPhone || null,
        notes: notes || null,
        userId
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
