import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    console.log('=== LESSONS API CALLED ===')
    
    // Raw query ile dersleri getir
    const rawLessons = await prisma.$queryRaw`SELECT * FROM lessons ORDER BY "createdAt" DESC`
    console.log('Raw lessons query result:', rawLessons)

    // Topics'ları ayrı olarak getir
    const rawTopics = await prisma.$queryRaw`SELECT * FROM topics ORDER BY "order" ASC`
    console.log('Raw topics query result:', rawTopics)

    // Raw data'yı formatla
    const formattedLessons = (rawLessons as Record<string, unknown>[]).map(lesson => ({
      id: lesson.id as string,
      name: lesson.name as string,
      group: lesson.group as string,
      type: lesson.type as string,
      subject: lesson.subject as string | null,
      userId: lesson.userId as string,
      createdAt: lesson.createdAt as string,
      topics: (rawTopics as Record<string, unknown>[]).filter(topic => topic.lessonId === lesson.id).map(topic => ({
        id: topic.id as string,
        name: topic.name as string,
        order: topic.order as number,
        lessonId: topic.lessonId as string,
        createdAt: topic.createdAt as string
      }))
    }))

    console.log('Formatted lessons:', formattedLessons.length, formattedLessons)

    return NextResponse.json(formattedLessons)
  } catch (error) {
    console.error('Lessons fetch error:', error)
    console.error('Error details:', error)
    return NextResponse.json({ error: 'Failed to fetch lessons', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const { name, group, type, subject } = await request.json()
    
    if (!name || !group) {
      return NextResponse.json({ error: 'Ders adı ve grup zorunludur' }, { status: 400 })
    }

    // Demo kullanıcısını oluştur veya bul
    let demoUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    })

    if (!demoUser) {
      demoUser = await prisma.user.create({
        data: {
          id: 'demo-user-id',
          email: 'admin@example.com',
          name: 'Admin Öğretmen'
        }
      })
    }

    console.log('Creating lesson:', { name, group, userId: demoUser.id })

    const lesson = await prisma.lesson.create({
      data: {
        name,
        group,
        type: type || 'TYT', // Fallback to TYT if not provided
        subject: subject || null,
        userId: demoUser.id
      }
    })

    console.log('Lesson created successfully:', lesson)
    return NextResponse.json(lesson, { status: 201 })
  } catch (error) {
    console.error('Lesson creation error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Failed to create lesson',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
