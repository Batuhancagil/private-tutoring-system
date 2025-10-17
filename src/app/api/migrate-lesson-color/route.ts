import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Run raw SQL to add column if not exists
    await prisma.$executeRaw`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'blue'
    `

    // Update existing lessons
    await prisma.$executeRaw`
      UPDATE lessons 
      SET color = 'blue' 
      WHERE color IS NULL
    `

    // Make column non-nullable
    await prisma.$executeRaw`
      ALTER TABLE lessons 
      ALTER COLUMN color SET NOT NULL
    `

    // Automatically assign unique colors to all lessons
    const availableColors = ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'gray', 'yellow', 'indigo', 'pink', 'teal']
    
    const allLessons = await prisma.lesson.findMany({
      orderBy: { createdAt: 'asc' }
    })

    // Assign unique colors
    for (let i = 0; i < allLessons.length; i++) {
      const lesson = allLessons[i]
      const colorIndex = i % availableColors.length
      const assignedColor = availableColors[colorIndex]
      
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { color: assignedColor }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Migration completed successfully',
      lessonsUpdated: allLessons.length
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

