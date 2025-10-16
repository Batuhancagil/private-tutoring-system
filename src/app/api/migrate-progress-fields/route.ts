import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🔄 Migrating StudentProgress fields...')
    
    // Add new columns if they don't exist
    await prisma.$executeRaw`
      ALTER TABLE student_progress 
      ADD COLUMN IF NOT EXISTS correct_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wrong_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS empty_count INTEGER DEFAULT 0;
    `
    
    console.log('✅ Migration completed successfully')
    
    return NextResponse.json({
      success: true,
      message: 'StudentProgress fields migrated successfully',
      addedFields: ['correctCount', 'wrongCount', 'emptyCount']
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
