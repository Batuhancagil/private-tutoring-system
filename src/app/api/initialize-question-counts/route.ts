import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Step 1: Update ResourceTopic questionCounts
    // TYT kaynaklar: 100 soru, AYT kaynaklar: 150 soru
    const resourceTopics = await prisma.resourceTopic.findMany({
      include: {
        resource: true,
        topic: {  // This will be lessonTopic in new schema
          include: {
            lesson: true
          }
        }
      }
    })

    let updatedResourceTopics = 0
    for (const rt of resourceTopics) {
      // Kaynağa göre soru sayısı belirleme
      let questionCount = 100 // Default

      // resource.name → resource.resourceName
      // topic.lesson.type → topic.lesson.lessonExamType
      if (rt.resource.resourceName.includes('AYT') || rt.topic.lesson.lessonExamType === 'AYT') {
        questionCount = 150
      } else if (rt.resource.resourceName.includes('TYT') || rt.topic.lesson.lessonExamType === 'TYT') {
        questionCount = 100
      }

      // questionCount → resourceTopicQuestionCount
      await prisma.resourceTopic.update({
        where: { id: rt.id },
        data: { resourceTopicQuestionCount: questionCount }
      })

      updatedResourceTopics++
    }

    // Step 2: Update StudentAssignment questionCounts
    const allAssignments = await prisma.studentAssignment.findMany()

    let updatedAssignments = 0
    let skippedAssignments = 0

    for (const assignment of allAssignments) {
      try {
        // Fetch full assignment data
        const fullAssignment = await prisma.studentAssignment.findUnique({
          where: { id: assignment.id },
          include: {
            lessonTopic: {  // topic → lessonTopic
              include: {
                lesson: true,
                resourceTopics: {
                  include: {
                    resource: true
                  }
                }
              }
            }
          }
        })


        // Skip if lessonTopic is null
        if (!fullAssignment || !fullAssignment.lessonTopic) {
          skippedAssignments++
          continue
        }

        // Her kaynak için soru sayısı hesapla
        const questionCounts: Record<string, number> = {}  // Simplified structure

        for (const rt of fullAssignment.lessonTopic.resourceTopics) {
          // Kaynağa göre soru sayısı
          let count = 100
          if (rt.resource.resourceName.includes('AYT') || fullAssignment.lessonTopic.lesson.lessonExamType === 'AYT') {
            count = 150
          }

          questionCounts[rt.resourceId] = count
        }

        // questionCounts → studentAssignedResourceTopicQuestionCounts
        await prisma.studentAssignment.update({
          where: { id: assignment.id },
          data: { studentAssignedResourceTopicQuestionCounts: questionCounts }
        })

        updatedAssignments++
      } catch (err) {
        console.error(`❌ Error processing assignment ${assignment.id}:`, err)
        skippedAssignments++
      }
    }

    // Step 3: StudentProgress - totalCount field NO LONGER EXISTS in new schema
    // Skip this step entirely

    return NextResponse.json({
      success: true,
      message: 'Question counts initialized successfully',
      stats: {
        resourceTopics: updatedResourceTopics,
        assignments: {
          updated: updatedAssignments,
          skipped: skippedAssignments
        },
        progressRecords: {
          note: 'totalCount field removed from schema - no updates needed'
        }
      }
    })

  } catch (error) {
    console.error('❌ Error initializing question counts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize question counts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
