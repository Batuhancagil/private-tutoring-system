import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
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
          skippedRecords++
          continue
        }

      // For each resource in this topic
      for (const rt of fullAssignment.lessonTopic.resourceTopics) {
        try {
          // Check if progress record already exists
          const existingProgress = await prisma.studentProgress.findUnique({
            where: {
              studentId_studentAssignmentId_resourceId: {  // Updated unique constraint name
                studentId: assignment.studentId,
                studentAssignmentId: assignment.id,  // assignmentId → studentAssignmentId
                resourceId: rt.resourceId
              }
            }
          })

          if (existingProgress) {
            // Progress already exists, skip
            skippedRecords++
            continue
          }

          // Create new progress record (totalCount removed from schema)
          await prisma.studentProgress.create({
            data: {
              studentId: fullAssignment.studentId,
              studentAssignmentId: fullAssignment.id,  // assignmentId → studentAssignmentId
              resourceId: rt.resourceId,
              lessonTopicId: fullAssignment.lessonTopicId,  // topicId → lessonTopicId
              studentProgressSolvedCount: 0,  // solvedCount → studentProgressSolvedCount
              studentProgressCorrectCount: 0,  // NEW
              studentProgressWrongCount: 0,    // NEW
              studentProgressEmptyCount: 0,    // NEW
              studentProgressLastSolvedAt: new Date()  // lastSolvedAt → studentProgressLastSolvedAt
            }
          })

          createdRecords++
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

