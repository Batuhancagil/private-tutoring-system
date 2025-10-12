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
    const allAssignments = await prisma.studentAssignment.findMany()
    
    let updatedAssignments = 0
    let skippedAssignments = 0
    
    for (const assignment of allAssignments) {
      try {
        // Fetch full assignment data
        const fullAssignment = await prisma.studentAssignment.findUnique({
          where: { id: assignment.id },
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
        
        // Skip if topic is null
        if (!fullAssignment || !fullAssignment.topic) {
          console.log(`⚠️ Skipping assignment ${assignment.id} - no topic`)
          skippedAssignments++
          continue
        }
        
        // Her kaynak için soru sayısı hesapla
        const questionCounts: Record<string, Record<string, number>> = {}
        
        for (const rt of fullAssignment.topic.resourceTopics) {
          if (!questionCounts[rt.resourceId]) {
            questionCounts[rt.resourceId] = {}
          }
          
          // Kaynağa göre soru sayısı
          let count = 100
          if (rt.resource.name.includes('AYT') || fullAssignment.topic.lesson.type === 'AYT') {
            count = 150
          }
          
          questionCounts[rt.resourceId][fullAssignment.topicId] = count
        }
        
        await prisma.studentAssignment.update({
          where: { id: assignment.id },
          data: { questionCounts }
        })
        
        updatedAssignments++
      } catch (err) {
        console.error(`❌ Error processing assignment ${assignment.id}:`, err)
        skippedAssignments++
      }
    }
    
    console.log(`✅ Updated ${updatedAssignments} student assignments`)
    console.log(`⚠️ Skipped ${skippedAssignments} assignments`)
    
    // Step 3: Update StudentProgress totalCount
    const allProgress = await prisma.studentProgress.findMany()
    
    let updatedProgress = 0
    let skippedProgress = 0
    
    for (const progress of allProgress) {
      try {
        // Fetch full progress data
        const fullProgress = await prisma.studentProgress.findUnique({
          where: { id: progress.id },
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
        
        // Skip if assignment or topic is null
        if (!fullProgress || !fullProgress.assignment || !fullProgress.assignment.topic) {
          console.log(`⚠️ Skipping progress ${progress.id} - no topic`)
          skippedProgress++
          continue
        }
        
        // Kaynağa göre hedef soru sayısı
        let totalCount = 100
        if (fullProgress.resource.name.includes('AYT') || fullProgress.assignment.topic.lesson.type === 'AYT') {
          totalCount = 150
        }
        
        await prisma.studentProgress.update({
          where: { id: progress.id },
          data: { totalCount }
        })
        
        updatedProgress++
      } catch (err) {
        console.error(`❌ Error processing progress ${progress.id}:`, err)
        skippedProgress++
      }
    }
    
    console.log(`✅ Updated ${updatedProgress} progress records`)
    console.log(`⚠️ Skipped ${skippedProgress} progress records`)
    
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
          updated: updatedProgress,
          skipped: skippedProgress
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

