import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/set-superadmin-password-simple
 * 
 * Sets a secure password for superadmin using raw SQL to avoid Prisma issues
 */
export async function POST() {
  try {
    console.log('🔄 Setting superadmin password...')

    // Hash the password
    const superadminPassword = 'SuperAdmin2024!'
    const hashedPassword = await bcrypt.hash(superadminPassword, 12)

    // Use raw SQL to update the password to avoid Prisma timestamp issues
    const result = await prisma.$executeRaw`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE email = 'superadmin@tutoring.com' AND role = 'SUPER_ADMIN'
    `

    console.log('✅ Superadmin password set successfully')

    return NextResponse.json({
      success: true,
      message: 'Superadmin password set successfully',
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
    console.error('❌ Failed to set superadmin password:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to set superadmin password',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/set-superadmin-password-simple
 * 
 * Check if superadmin has a password set
 */
export async function GET() {
  try {
    // Use raw SQL to check if password is set
    const result = await prisma.$queryRaw`
      SELECT id, email, name, role, 
             CASE WHEN password IS NOT NULL THEN true ELSE false END as has_password
      FROM users 
      WHERE email = 'superadmin@tutoring.com' AND role = 'SUPER_ADMIN'
    `

    const user = Array.isArray(result) && result.length > 0 ? result[0] : null

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Superadmin user not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      hasPassword: user.has_password,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      instructions: {
        message: user.has_password 
          ? 'Superadmin has a secure password set'
          : 'Superadmin has no password set - run POST to set one'
      }
    })

  } catch (error) {
    console.error('❌ Failed to check superadmin password status:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to check superadmin password status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
