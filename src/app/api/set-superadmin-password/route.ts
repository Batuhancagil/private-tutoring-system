import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * POST /api/set-superadmin-password
 * 
 * Sets a secure password for the superadmin user
 * This endpoint should be protected or removed after use!
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || password.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long'
      }, { status: 400 })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update superadmin user with the new password
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

    console.log('✅ Superadmin password updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Superadmin password updated successfully',
      user: updatedUser,
      instructions: {
        email: 'superadmin@tutoring.com',
        password: 'The password you just set',
        note: 'You can now login with secure password authentication'
      }
    })

  } catch (error) {
    console.error('❌ Failed to set superadmin password:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to set superadmin password',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/set-superadmin-password
 * 
 * Check if superadmin has a password set
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
      hasPassword: !!superadmin.password,
      user: {
        id: superadmin.id,
        email: superadmin.email,
        name: superadmin.name,
        role: superadmin.role
      },
      instructions: {
        hasPassword: !!superadmin.password,
        message: superadmin.password 
          ? 'Superadmin has a secure password set'
          : 'Superadmin has no password set - use POST to set one'
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
