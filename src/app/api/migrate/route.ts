import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('Starting database migration...')
    
    // Test if we can connect to database
    await prisma.$connect()
    console.log('Database connected successfully')
    
    // Try to create a simple test record
    const testUser = await prisma.user.findFirst()
    console.log('Test user found:', testUser?.email)
    
    // Try to create student assignment table manually
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS student_assignments (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "studentId" TEXT NOT NULL,
          "topicId" TEXT NOT NULL,
          "assignedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed BOOLEAN DEFAULT false,
          UNIQUE("studentId", "topicId")
        )
      `
      console.log('Student assignments table created successfully')
    } catch (error) {
      console.error('Error creating table:', error)
    }
    
    return NextResponse.json({ 
      message: 'Migration completed',
      success: true 
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
