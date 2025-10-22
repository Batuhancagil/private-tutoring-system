import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth-helpers'

/**
 * POST /api/migrate-password-field
 * 
 * Adds password field to users table and sets a secure password for superadmin
 * This endpoint should be protected or removed after use!
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require super admin authentication
    const { user, response } = await requireSuperAdmin()
    if (response) return response

    console.log('🔄 Starting password field migration...')

    // First, check if password field already exists
    const existingUser = await prisma.user.findFirst({
      where: { password: { not: null } }
    })

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Password field already exists and has data',
        note: 'Migration already completed'
      })
    }

    // Set a secure password for superadmin
    const bcrypt = await import('bcryptjs')
    const superadminPassword = 'SuperAdmin2024!'
    const hashedPassword = await bcrypt.hash(superadminPassword, 12)

    const updatedUser = await prisma.user.update({
      where: { 
        email: 'superadmin@tutoring.com',
        role: 'SUPER_ADMIN'
      },
      data: {
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    console.log('✅ Password field migration completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Password field migration completed successfully',
      superadmin: updatedUser,
      credentials: {
        email: 'superadmin@tutoring.com',
        password: 'SuperAdmin2024!',
        note: 'You can now login with this secure password'
      },
      security: {
        passwordHashed: true,
        bcryptRounds: 12,
        note: 'Password is securely hashed and stored'
      }
    })

  } catch (error) {
    console.error('❌ Password field migration failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Password field migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/migrate-password-field
 * 
 * Check migration status
 */
export async function GET() {
  try {
    const superadmin = await prisma.user.findUnique({
      where: { 
        email: 'superadmin@tutoring.com',
        role: 'SUPER_ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true
      }
    })

    if (!superadmin) {
      return NextResponse.json({
        success: false,
        error: 'Superadmin user not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      migrationStatus: {
        hasPassword: !!superadmin.password,
        userExists: true,
        readyForSecureAuth: !!superadmin.password
      },
      user: {
        id: superadmin.id,
        email: superadmin.email,
        name: superadmin.name,
        role: superadmin.role
      },
      instructions: {
        message: superadmin.password 
          ? 'Migration completed - superadmin has secure password'
          : 'Migration needed - run POST to add password field and set superadmin password'
      }
    })

  } catch (error) {
    console.error('❌ Failed to check migration status:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
