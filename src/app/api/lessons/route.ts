import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const lessons = await prisma.lesson.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(lessons)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, section } = await request.json()
    
    if (!name || !section) {
      return NextResponse.json({ error: 'Ders adı ve bölümü zorunludur' }, { status: 400 })
    }

    const lesson = await prisma.lesson.create({
      data: {
        name,
        section
      }
    })

    return NextResponse.json(lesson, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 })
  }
}
