import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/add-password-column
 * 
 * Adds password column to users table using raw SQL
 * This is needed because Prisma can't query a column that doesn't exist yet
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Adding password column to users table...')

    // Use raw SQL to add the password column
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;`

    console.log('✅ Password column added successfully')

    // Now set a secure password for superadmin
    const bcrypt = require('bcryptjs')
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

    console.log('✅ Superadmin password set successfully')

    return NextResponse.json({
      success: true,
      message: 'Password column added and superadmin password set successfully',
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
    console.error('❌ Failed to add password column:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to add password column',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/add-password-column
 * 
 * Check if password column exists
 */
export async function GET() {
  try {
    // Try to query the password column to see if it exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password'
    `

    const hasPasswordColumn = Array.isArray(result) && result.length > 0

    return NextResponse.json({
      success: true,
      hasPasswordColumn,
      message: hasPasswordColumn 
        ? 'Password column exists in users table'
        : 'Password column does not exist - run POST to add it'
    })

  } catch (error) {
    console.error('❌ Failed to check password column status:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to check password column status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
