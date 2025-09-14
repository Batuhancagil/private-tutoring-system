import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // Demo için geçici olarak tüm dersleri döndür
    if (!session?.user) {
      return NextResponse.json([])
    }

    const lessons = await prisma.lesson.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(lessons)
  } catch (error) {
    console.error('Lessons fetch error:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Demo için geçici olarak userId'yi sabit değer yap
    const userId = session?.user?.id || 'demo-user-id'

    const { name, section } = await request.json()
    
    if (!name || !section) {
      return NextResponse.json({ error: 'Ders adı ve bölümü zorunludur' }, { status: 400 })
    }

    const lesson = await prisma.lesson.create({
      data: {
        name,
        section,
        userId: userId
      }
    })

    return NextResponse.json(lesson, { status: 201 })
  } catch (error) {
    console.error('Lesson creation error:', error)
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 })
  }
}
