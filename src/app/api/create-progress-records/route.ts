import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🔢 Creating missing progress records...')
    
    // Get all student assignments (without include to avoid null errors)
    const allAssignments = await prisma.studentAssignment.findMany()
    
    let createdRecords = 0
    let skippedRecords = 0
    
    for (const assignment of allAssignments) {
      try {
        // Fetch full assignment data individually
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
          skippedRecords++
          continue
        }
      
      // For each resource in this topic
      for (const rt of fullAssignment.topic.resourceTopics) {
        try {
          // Check if progress record already exists
          const existingProgress = await prisma.studentProgress.findUnique({
            where: {
              studentId_assignmentId_resourceId: {
                studentId: assignment.studentId,
                assignmentId: assignment.id,
                resourceId: rt.resourceId
              }
            }
          })
          
          if (existingProgress) {
            // Update totalCount if it's 0
            if (existingProgress.totalCount === 0) {
              let totalCount = 100
              if (rt.resource.name.includes('AYT') || fullAssignment.topic.lesson.type === 'AYT') {
                totalCount = 150
              }
              
              await prisma.studentProgress.update({
                where: { id: existingProgress.id },
                data: { totalCount }
              })
              
              console.log(`✅ Updated existing progress: ${fullAssignment.topic.name} - ${rt.resource.name}`)
            }
            continue
          }
          
          // Create new progress record
          let totalCount = 100
          if (rt.resource.name.includes('AYT') || fullAssignment.topic.lesson.type === 'AYT') {
            totalCount = 150
          }
          
          await prisma.studentProgress.create({
            data: {
              studentId: fullAssignment.studentId,
              assignmentId: fullAssignment.id,
              resourceId: rt.resourceId,
              topicId: fullAssignment.topicId,
              solvedCount: 0,
              totalCount: totalCount,
              lastSolvedAt: new Date()
            }
          })
          
          createdRecords++
          console.log(`✅ Created progress: ${fullAssignment.topic.name} - ${rt.resource.name}`)
        } catch (err) {
          console.error(`❌ Error processing progress:`, err)
          skippedRecords++
        }
      }
      } catch (err) {
        console.error(`❌ Error processing assignment ${assignment.id}:`, err)
        skippedRecords++
      }
    }
    
    console.log(`✅ Created ${createdRecords} progress records`)
    console.log(`⚠️ Skipped ${skippedRecords} records`)
    
    return NextResponse.json({
      success: true,
      message: 'Progress records created successfully',
      stats: {
        created: createdRecords,
        skipped: skippedRecords
      }
    })
    
  } catch (error) {
    console.error('❌ Error creating progress records:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create progress records',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

