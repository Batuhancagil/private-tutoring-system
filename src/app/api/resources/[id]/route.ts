import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateResourceSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const resource = await prisma.resource.findUnique({
      where: { id },
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

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Resource fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('PUT /api/resources/[id] - Resource ID:', id)

    const body = await request.json()
    console.log('PUT /api/resources/[id] - Request body:', body)

    // Transform the data structure to match the validation schema
    const validationData = {
      name: body.name,
      description: body.description,
      lessons: body.lessonIds?.map((lessonId: string) => ({
        lessonId,
        topics: body.topicIds
          ?.filter((topicId: string) => {
            // Filter topics that belong to this lesson
            // This will be checked more thoroughly during database operations
            return true // Accept all for now, will filter in transaction
          })
          .map((topicId: string) => ({
            topicId,
            questionCount: body.topicQuestionCounts?.[topicId]
          }))
      }))
    }

    // Validate request body
    const validation = validateRequest(updateResourceSchema, validationData)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error }, { status: 400 })
    }

    const { name, description } = validation.data
    const { lessonIds, topicIds, topicQuestionCounts } = body

    // Tüm işlemleri transaction içinde yap
    const result = await prisma.$transaction(async (tx) => {
      // Resource'u güncelle
      console.log('Updating resource:', { id, name, description })
      const resource = await tx.resource.update({
        where: { id },
        data: {
          name,
          description: description || null
        }
      })
      console.log('Resource updated successfully:', resource.id)

      // Mevcut ilişkileri sil
      console.log('Deleting existing relationships...')
      await tx.resourceTopic.deleteMany({
        where: { resourceId: id }
      })
      await tx.resourceLesson.deleteMany({
        where: { resourceId: id }
      })
      console.log('Existing relationships deleted')

      // Yeni ders ilişkilerini oluştur
      console.log('Creating new lesson relationships:', { lessonIds, topicIds, topicQuestionCounts })
      if (lessonIds && lessonIds.length > 0) {
        for (const lessonId of lessonIds) {
          console.log('Creating resource lesson for lessonId:', lessonId)
          const resourceLesson = await tx.resourceLesson.create({
            data: {
              resourceId: id,
              lessonId
            }
          })
          console.log('Resource lesson created:', resourceLesson.id)

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
                console.log('Creating resource topics for lesson:', lessonId, 'topics:', lessonTopics)
                await tx.resourceTopic.createMany({
                  data: lessonTopics.map((topicId: string) => ({
                    resourceId: id,
                    topicId,
                    resourceLessonId: resourceLesson.id,
                    questionCount: (topicQuestionCounts && topicQuestionCounts[topicId]) || 0
                  }))
                })
                console.log('Resource topics created successfully')
              }
            }
          }
        }
      }
      
      return resource
    })

    // Güncellenmiş resource'u döndür
    const updatedResource = await prisma.resource.findUnique({
      where: { id },
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

    return NextResponse.json(updatedResource)
  } catch (error) {
    console.error('Resource update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Önce ders ilişkilerini sil
    await prisma.resourceLesson.deleteMany({
      where: { resourceId: id }
    })

    // Sonra resource'u sil
    await prisma.resource.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resource delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
