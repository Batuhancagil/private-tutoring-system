import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('=== ASSIGNING COLORS TO EXISTING LESSONS ===')
    
    // Available colors for assignment
    const availableColors = ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'gray']
    
    // Get all lessons - we'll filter in memory since Prisma null check is complex
    const allLessons = await prisma.lesson.findMany()
    
    // Filter lessons without colors or with default color
    const lessons = allLessons.filter(lesson => 
      !lesson.color || lesson.color === 'blue'
    )
    
    console.log(`Found ${lessons.length} lessons to assign colors`)
    
    // Assign colors sequentially
    const updatedLessons = []
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      const colorIndex = i % availableColors.length
      const assignedColor = availableColors[colorIndex]
      
      const updatedLesson = await prisma.lesson.update({
        where: { id: lesson.id },
        data: { color: assignedColor }
      })
      
      updatedLessons.push(updatedLesson)
      console.log(`Assigned ${assignedColor} to lesson: ${lesson.name}`)
    }
    
    console.log(`Successfully assigned colors to ${updatedLessons.length} lessons`)
    
    return NextResponse.json({
      message: `Successfully assigned colors to ${updatedLessons.length} lessons`,
      lessons: updatedLessons
    })
    
  } catch (error) {
    console.error('Color assignment error:', error)
    return NextResponse.json({ 
      error: 'Failed to assign colors to lessons',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
