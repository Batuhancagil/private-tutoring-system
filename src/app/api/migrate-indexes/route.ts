import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('Creating database indexes for weekly schedules...')
    
    // Create indexes for better performance
    const indexes = [
      // WeeklySchedule indexes
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_student_id ON weekly_schedules(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_is_active ON weekly_schedules(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_created_at ON weekly_schedules(created_at)',
      
      // WeeklyScheduleWeek indexes
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_week_schedule_id ON weekly_schedule_weeks(schedule_id)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_week_number ON weekly_schedule_weeks(week_number)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_week_start_date ON weekly_schedule_weeks(start_date)',
      
      // WeeklyScheduleTopic indexes
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_topic_week_plan_id ON weekly_schedule_topics(week_plan_id)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_topic_assignment_id ON weekly_schedule_topics(assignment_id)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_topic_order ON weekly_schedule_topics(topic_order)',
      'CREATE INDEX IF NOT EXISTS idx_weekly_schedule_topic_is_completed ON weekly_schedule_topics(is_completed)',
      
      // StudentAssignment indexes (if not exists)
      'CREATE INDEX IF NOT EXISTS idx_student_assignment_student_id ON student_assignments(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_student_assignment_topic_id ON student_assignments(topic_id)',
      
      // Topic indexes (if not exists)
      'CREATE INDEX IF NOT EXISTS idx_topic_lesson_id ON topics(lesson_id)',
      'CREATE INDEX IF NOT EXISTS idx_topic_order ON topics("order")',
      
      // Lesson indexes (if not exists)
      'CREATE INDEX IF NOT EXISTS idx_lesson_name ON lessons(name)'
    ]
    
    for (const indexQuery of indexes) {
      await prisma.$executeRawUnsafe(indexQuery)
      console.log(`Created index: ${indexQuery.split(' ')[4]}`)
    }
    
    console.log('All indexes created successfully!')
    
    return NextResponse.json({
      message: 'Database indexes created successfully',
      indexesCreated: indexes.length
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error creating indexes:', error)
    return NextResponse.json({
      error: 'Failed to create indexes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
