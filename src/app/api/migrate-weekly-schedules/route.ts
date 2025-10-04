import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    
    // Create weekly_schedules table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "weekly_schedules" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "studentId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "weekly_schedules_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `
    
    // Create weekly_schedule_weeks table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "weekly_schedule_weeks" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "scheduleId" TEXT NOT NULL,
        "weekNumber" INTEGER NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "weekly_schedule_weeks_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "weekly_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `
    
    // Create weekly_schedule_topics table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "weekly_schedule_topics" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "weekPlanId" TEXT NOT NULL,
        "assignmentId" TEXT NOT NULL,
        "topicOrder" INTEGER NOT NULL,
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "weekly_schedule_topics_weekPlanId_fkey" FOREIGN KEY ("weekPlanId") REFERENCES "weekly_schedule_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "weekly_schedule_topics_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "student_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `
    
    // Create unique indexes
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "weekly_schedule_weeks_scheduleId_weekNumber_key"
      ON "weekly_schedule_weeks"("scheduleId", "weekNumber")
    `
    
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "weekly_schedule_topics_weekPlanId_assignmentId_key"
      ON "weekly_schedule_topics"("weekPlanId", "assignmentId")
    `
    
    return NextResponse.json({
      message: 'Weekly schedule tables created successfully',
      success: true
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create weekly schedule tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
