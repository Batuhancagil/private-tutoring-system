import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Get all lessons
    const lessons = await prisma.lesson.findMany({
      include: {
        topics: {
          orderBy: {
            createdAt: 'asc' // Use creation order as fallback
          }
        }
      }
    })

    // Fix order for each lesson
    for (const lesson of lessons) {
      // Update each topic with sequential order
      for (let i = 0; i < lesson.topics.length; i++) {
        const topic = lesson.topics[i]
        const newOrder = i + 1

        await prisma.topic.update({
          where: { id: topic.id },
          data: { order: newOrder }
        })
      }
    }
    
    return NextResponse.json({
      message: 'Topic orders fixed successfully',
      lessonsProcessed: lessons.length,
      totalTopics: lessons.reduce((sum, lesson) => sum + lesson.topics.length, 0)
    })

  } catch (error) {
    console.error('Error fixing topic orders:', error)
    return NextResponse.json({
      error: 'Failed to fix topic orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
