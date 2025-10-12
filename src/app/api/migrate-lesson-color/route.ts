import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('=== MIGRATING LESSON COLOR COLUMN ===')
    
    // Run raw SQL to add column if not exists
    await prisma.$executeRaw`
      ALTER TABLE lessons 
      ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'blue'
    `
    
    console.log('✅ Column added successfully')
    
    // Update existing lessons
    await prisma.$executeRaw`
      UPDATE lessons 
      SET color = 'blue' 
      WHERE color IS NULL
    `
    
    console.log('✅ Existing lessons updated')
    
    // Make column non-nullable
    await prisma.$executeRaw`
      ALTER TABLE lessons 
      ALTER COLUMN color SET NOT NULL
    `
    
    console.log('✅ Column set to NOT NULL')
    
    return NextResponse.json({ 
      success: true,
      message: 'Migration completed successfully'
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

