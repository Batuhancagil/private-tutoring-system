import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('=== TEST DB API CALLED ===')
    
    // Test 1: Kullanıcıları listele
    const users = await prisma.user.findMany()
    console.log('Users found:', users.length)
    
    // Test 2: Dersleri listele
    const lessons = await prisma.lesson.findMany()
    console.log('Lessons found:', lessons.length)
    
    // Test 3: Raw query ile dersleri listele
    const rawLessons = await prisma.$queryRaw`SELECT id, name, "userId" FROM lessons`
    console.log('Raw lessons:', rawLessons)
    
    return NextResponse.json({
      users: users.length,
      lessons: lessons.length,
      rawLessons: rawLessons,
      userDetails: users.map(u => ({ id: u.id, email: u.email, name: u.name })),
      lessonDetails: lessons.map(l => ({ id: l.id, name: l.name, userId: l.userId }))
    })
  } catch (error) {
    console.error('Test DB error:', error)
    return NextResponse.json({ 
      error: 'Database test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
