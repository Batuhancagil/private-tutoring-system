import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { user, response } = await requireAuth()
    if (!user) return response

    const resources = await prisma.resource.findMany({
      where: {
        userId: user.id
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
    const { user, response } = await requireAuth()
    if (!user) return response

    const { name, description, lessonIds, topicIds, topicQuestionCounts } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const userId = user.id

    // Tüm işlemleri transaction içinde yap
    const result = await prisma.$transaction(async (tx) => {
      // Resource oluştur
      const resource = await tx.resource.create({
        data: {
          name,
          description: description || null,
          userId
        }
      })

      // Ders ilişkilerini oluştur
      if (lessonIds && lessonIds.length > 0) {
        for (const lessonId of lessonIds) {
          const resourceLesson = await tx.resourceLesson.create({
            data: {
              resourceId: resource.id,
              lessonId
            }
          })

          // Bu derse ait seçili konuları ekle
          if (topicIds && topicIds.length > 0) {
            // Bu derse ait konuları filtrele
            const lesson = await tx.lesson.findUnique({
              where: { id: lessonId },
              include: { topics: true }
            })
            
            if (lesson) {
              const lessonTopicIds = lesson.topics.map(topic => topic.id)
              const lessonTopics = topicIds.filter((topicId: string) => lessonTopicIds.includes(topicId))
              
              if (lessonTopics.length > 0) {
                await tx.resourceTopic.createMany({
                  data: lessonTopics.map((topicId: string) => ({
                    resourceId: resource.id,
                    topicId,
                    resourceLessonId: resourceLesson.id,
                    questionCount: (topicQuestionCounts && topicQuestionCounts[topicId]) || 0
                  }))
                })
              }
            }
          }
        }
      }
      
      return resource
    })

    // Resource'u derslerle birlikte döndür
    const resourceWithLessons = await prisma.resource.findUnique({
      where: { id: result.id },
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
