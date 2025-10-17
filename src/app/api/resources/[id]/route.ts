import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateRequest, updateResourceSchema } from '@/lib/validations'
import { handleAPIError, createValidationErrorResponse, createSuccessResponse, createNotFoundResponse } from '@/lib/error-handler'

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
      return createNotFoundResponse('Resource')
    }

    return createSuccessResponse(resource)
  } catch (error) {
    return handleAPIError(error, 'Resource fetch')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()

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
      return createValidationErrorResponse(validation.error)
    }

    const { name, description } = validation.data
    const { lessonIds, topicIds, topicQuestionCounts } = body

    // Tüm işlemleri transaction içinde yap
    const result = await prisma.$transaction(async (tx) => {
      // Resource'u güncelle
      const resource = await tx.resource.update({
        where: { id },
        data: {
          resourceName: name,  // name → resourceName
          resourceDescription: description || null  // description → resourceDescription
        }
      })

      // Mevcut ilişkileri sil
      await tx.resourceTopic.deleteMany({
        where: { resourceId: id }
      })
      await tx.resourceLesson.deleteMany({
        where: { resourceId: id }
      })

      // Yeni ders ilişkilerini oluştur
      if (lessonIds && lessonIds.length > 0) {
        for (const lessonId of lessonIds) {
          const resourceLesson = await tx.resourceLesson.create({
            data: {
              resourceId: id,
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
                    resourceId: id,
                    topicId,
                    resourceLessonId: resourceLesson.id,
                    resourceTopicQuestionCount: (topicQuestionCounts && topicQuestionCounts[topicId]) || 0  // questionCount → resourceTopicQuestionCount
                  }))
                })
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

    return createSuccessResponse(updatedResource)
  } catch (error) {
    return handleAPIError(error, 'Resource update')
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

    return createSuccessResponse({ success: true })
  } catch (error) {
    return handleAPIError(error, 'Resource deletion')
  }
}
