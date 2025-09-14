import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Demo için geçici olarak tüm konuları döndür
    if (!session?.user) {
      return NextResponse.json([])
    }

    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 })
    }

    const topics = await prisma.topic.findMany({
      where: { lessonId },
      orderBy: { order: 'asc' }
    })

    // Geçici olarak questionCount'u 0 olarak döndür
    const topicsWithQuestionCount = topics.map(topic => ({
      ...topic,
      questionCount: 0 // Geçici olarak 0
    }))
    
    return NextResponse.json(topicsWithQuestionCount)
  } catch (error) {
    console.error('Topics fetch error:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const { lessonId, name } = await request.json()
    
    if (!lessonId || !name) {
      return NextResponse.json({ error: 'Lesson ID and name are required' }, { status: 400 })
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

    // Otomatik sıralama: mevcut konu sayısı + 1
    const existingTopicsCount = await prisma.topic.count({
      where: { lessonId }
    })

    console.log('Creating topic:', { lessonId, name, order: existingTopicsCount + 1 })

    const topic = await prisma.topic.create({
      data: {
        name,
        order: existingTopicsCount + 1,
        lessonId
      }
    })

    console.log('Topic created successfully:', topic)
    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    console.error('Topic creation error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ 
      error: 'Failed to create topic',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
