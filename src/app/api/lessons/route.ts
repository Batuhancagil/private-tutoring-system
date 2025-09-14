import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    console.log('=== LESSONS API CALLED ===')
    
    // Tüm kullanıcıları listele
    const allUsers = await prisma.user.findMany()
    console.log('All users in database:', allUsers.length, allUsers.map(u => ({ id: u.id, email: u.email, name: u.name })))

    // Tüm dersleri getir (kullanıcı filtresi olmadan)
    const allLessons = await prisma.lesson.findMany({
      include: {
        topics: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log('All lessons in database:', allLessons.length, allLessons.map(l => ({ id: l.id, name: l.name, userId: l.userId })))

    // Debug için raw query de deneyelim
    const rawLessons = await prisma.$queryRaw`SELECT * FROM lessons ORDER BY createdAt DESC`
    console.log('Raw lessons query result:', rawLessons)

    return NextResponse.json(allLessons)
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
