import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('Adding questionCounts column to student_assignments table...')
    
    // Add questionCounts column to student_assignments table
    await prisma.$executeRaw`
      ALTER TABLE "student_assignments" 
      ADD COLUMN IF NOT EXISTS "questionCounts" JSONB
    `
    
    console.log('✅ questionCounts column added successfully')
    
    return NextResponse.json({ 
      message: 'questionCounts column added successfully',
      success: true
    }, { status: 200 })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Failed to add questionCounts column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
