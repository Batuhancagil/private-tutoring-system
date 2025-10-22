import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/seed
 *
 * Seeds the database with initial data (super admin user)
 *
 * IMPORTANT: This endpoint should be protected or removed in production!
 * For now, it allows seeding the super admin after database reset
 */
export async function POST() {
  try {
    console.log('🌱 Starting seed via API...')

    // Create super admin user (only account that can add teachers)
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@tutoring.com' },
      update: { role: 'SUPER_ADMIN' }, // Update role if user already exists
      create: {
        email: 'superadmin@tutoring.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    })

    console.log('✅ Created super admin user:', superAdmin)

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
      instructions: {
        email: 'superadmin@tutoring.com',
        password: 'any password (temporary bypass active)',
        note: 'Super admin can add teachers via /api/teachers endpoint'
      }
    })

  } catch (error) {
    console.error('❌ Seed failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Seed failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/seed
 *
 * Check seed endpoint status
 */
export async function GET() {
  return NextResponse.json({
    message: 'Seed endpoint ready',
    instructions: 'Send a POST request to this endpoint to seed the database with super admin',
    warning: 'This will create or update the super admin user',
    superAdminEmail: 'superadmin@tutoring.com'
  })
}
