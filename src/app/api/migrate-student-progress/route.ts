import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('Creating student_progress table...')
    
    // Create student_progress table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "student_progress" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "assignmentId" TEXT NOT NULL,
        "resourceId" TEXT NOT NULL,
        "topicId" TEXT NOT NULL,
        "solvedCount" INTEGER NOT NULL DEFAULT 0,
        "totalCount" INTEGER NOT NULL DEFAULT 0,
        "lastSolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "student_progress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "student_progress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "student_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "student_progress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "student_progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `
    
    // Create unique constraint
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "student_progress_studentId_assignmentId_resourceId_key" 
      ON "student_progress"("studentId", "assignmentId", "resourceId")
    `
    
    console.log('✅ student_progress table created successfully')
    
    return NextResponse.json({ 
      message: 'student_progress table created successfully',
      success: true
    }, { status: 200 })
    
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      error: 'Failed to create student_progress table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
