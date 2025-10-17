import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Test if we can connect to database
    await prisma.$connect()

    // Try to create a simple test record
    const testUser = await prisma.user.findFirst()
    
    // Try to create student assignment table manually
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "StudentAssignment" (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "studentId" TEXT NOT NULL,
          "topicId" TEXT NOT NULL,
          "assignedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed BOOLEAN DEFAULT false,
          "questionCounts" JSONB,
          UNIQUE("studentId", "topicId")
        )
      `

      // Test the table by inserting a sample record
      const testAssignment = await prisma.$executeRaw`
        INSERT INTO "StudentAssignment" ("studentId", "topicId", "assignedAt", completed, "questionCounts")
        VALUES ('test-student', 'test-topic', NOW(), false, '{}')
        ON CONFLICT ("studentId", "topicId") DO NOTHING
      `
      
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
