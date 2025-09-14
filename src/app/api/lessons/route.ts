import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lessons = await prisma.lesson.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(lessons)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, section } = await request.json()
    
    if (!name || !section) {
      return NextResponse.json({ error: 'Ders adı ve bölümü zorunludur' }, { status: 400 })
    }

    const lesson = await prisma.lesson.create({
      data: {
        name,
        section,
        userId: session.user.id
      }
    })

    return NextResponse.json(lesson, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 })
  }
}
