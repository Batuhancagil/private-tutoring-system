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

    const resources = await prisma.resource.findMany({
      where: {
        userId: session.user?.id || 'demo-user-id'
      },
      include: {
        lessons: {
          include: {
            lesson: {
              include: {
                topics: true
              }
            },
            topics: {
              include: {
                topic: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(resources)
  } catch (error) {
    console.error('Resources fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch resources',
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

    const { name, description, lessonIds, topicIds, topicQuestionCounts } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const userId = session?.user?.id || 'demo-user-id'

    // Resource oluştur
    const resource = await prisma.resource.create({
      data: {
        name,
        description: description || null,
        userId
      }
    })

    // Ders ilişkilerini oluştur
    if (lessonIds && lessonIds.length > 0) {
      for (const lessonId of lessonIds) {
        const resourceLesson = await prisma.resourceLesson.create({
          data: {
            resourceId: resource.id,
            lessonId
          }
        })

        // Bu derse ait seçili konuları ekle
        if (topicIds && topicIds.length > 0) {
          const lessonTopics = topicIds.filter((topicId: string) => {
            // Bu konunun bu derse ait olduğunu kontrol et
            return true // Bu kontrolü frontend'de yapacağız
          })
          
          if (lessonTopics.length > 0) {
            await prisma.resourceTopic.createMany({
              data: lessonTopics.map((topicId: string) => ({
                resourceId: resource.id,
                topicId,
                resourceLessonId: resourceLesson.id,
                questionCount: topicQuestionCounts?.[topicId] || 0
              }))
            })
          }
        }
      }
    }

    // Resource'u derslerle birlikte döndür
    const resourceWithLessons = await prisma.resource.findUnique({
      where: { id: resource.id },
      include: {
        lessons: {
          include: {
            lesson: {
              include: {
                topics: true
              }
            },
            topics: {
              include: {
                topic: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(resourceWithLessons)
  } catch (error) {
    console.error('Resource creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
