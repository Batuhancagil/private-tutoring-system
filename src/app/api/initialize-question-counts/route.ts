import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🔢 Initializing question counts...')
    
    // Step 1: Update ResourceTopic questionCounts
    // TYT kaynaklar: 100 soru, AYT kaynaklar: 150 soru
    const resourceTopics = await prisma.resourceTopic.findMany({
      include: {
        resource: true,
        topic: {
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
      
      if (rt.resource.name.includes('AYT') || rt.topic.lesson.type === 'AYT') {
        questionCount = 150
      } else if (rt.resource.name.includes('TYT') || rt.topic.lesson.type === 'TYT') {
        questionCount = 100
      }
      
      await prisma.resourceTopic.update({
        where: { id: rt.id },
        data: { questionCount }
      })
      
      updatedResourceTopics++
    }
    
    console.log(`✅ Updated ${updatedResourceTopics} resource topics`)
    
    // Step 2: Update StudentAssignment questionCounts
    const assignments = await prisma.studentAssignment.findMany({
      where: {
        topic: {
          isNot: null
        }
      },
      include: {
        topic: {
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
    
    let updatedAssignments = 0
    for (const assignment of assignments) {
      // Her kaynak için soru sayısı hesapla
      const questionCounts: Record<string, Record<string, number>> = {}
      
      for (const rt of assignment.topic.resourceTopics) {
        if (!questionCounts[rt.resourceId]) {
          questionCounts[rt.resourceId] = {}
        }
        
        // Kaynağa göre soru sayısı
        let count = 100
        if (rt.resource.name.includes('AYT') || assignment.topic.lesson.type === 'AYT') {
          count = 150
        }
        
        questionCounts[rt.resourceId][assignment.topicId] = count
      }
      
      await prisma.studentAssignment.update({
        where: { id: assignment.id },
        data: { questionCounts }
      })
      
      updatedAssignments++
    }
    
    console.log(`✅ Updated ${updatedAssignments} student assignments`)
    
    // Step 3: Update StudentProgress totalCount
    const progressRecords = await prisma.studentProgress.findMany({
      where: {
        assignment: {
          topic: {
            isNot: null
          }
        }
      },
      include: {
        assignment: {
          include: {
            topic: {
              include: {
                lesson: true
              }
            }
          }
        },
        resource: true
      }
    })
    
    let updatedProgress = 0
    for (const progress of progressRecords) {
      // Kaynağa göre hedef soru sayısı
      let totalCount = 100
      if (progress.resource.name.includes('AYT') || progress.assignment.topic.lesson.type === 'AYT') {
        totalCount = 150
      }
      
      await prisma.studentProgress.update({
        where: { id: progress.id },
        data: { totalCount }
      })
      
      updatedProgress++
    }
    
    console.log(`✅ Updated ${updatedProgress} progress records`)
    
    return NextResponse.json({
      success: true,
      message: 'Question counts initialized successfully',
      stats: {
        resourceTopics: updatedResourceTopics,
        assignments: updatedAssignments,
        progressRecords: updatedProgress
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

