import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    console.log('Lessons API called')
    const session = await getServerSession(authOptions)
    console.log('Session:', session)
    
    // Demo kullanıcısını bul veya oluştur
    let demoUser = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    })
    console.log('Demo user found:', demoUser)

    if (!demoUser) {
      console.log('Creating demo user...')
      demoUser = await prisma.user.create({
        data: {
          id: 'demo-user-id',
          email: 'admin@example.com',
          name: 'Admin Öğretmen'
        }
      })
      console.log('Demo user created:', demoUser)
    }

    // Önce demo kullanıcısının derslerini ara
    let lessons = await prisma.lesson.findMany({
      where: { userId: demoUser.id },
      include: {
        topics: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log('Lessons found for demo user:', lessons.length, lessons)

    // Eğer demo kullanıcısının dersi yoksa, tüm dersleri getir
    if (lessons.length === 0) {
      console.log('No lessons found for demo user, fetching all lessons...')
      lessons = await prisma.lesson.findMany({
        include: {
          topics: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      console.log('All lessons found:', lessons.length, lessons)
    }

    return NextResponse.json(lessons)
  } catch (error) {
    console.error('Lessons fetch error:', error)
    return NextResponse.json([])
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
