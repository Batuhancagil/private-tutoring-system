import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/test-auth?email=xxx
 * Test endpoint to verify user lookup and auth flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({
        error: 'Email parameter required',
        usage: '/api/test-auth?email=superadmin@tutoring.com'
      }, { status: 400 })
    }

    // Try to find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        image: true,
      }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
        email
      })
    }

    return NextResponse.json({
      success: true,
      message: 'User found successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        image: user.image,
      },
      authConfig: {
        hasRole: !!user.role,
        roleValue: user.role,
        canLogin: true,
        note: 'This user should be able to login with any password (temporary bypass active)'
      }
    })

  } catch (error) {
    console.error('Test auth error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
