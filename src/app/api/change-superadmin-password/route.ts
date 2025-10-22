import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import bcrypt from 'bcryptjs'

/**
 * POST /api/change-superadmin-password
 * 
 * Changes super admin password (requires authentication)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is super admin
    const { user, response } = await requireSuperAdmin()
    if (response) return response

    const body = await request.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Şifre en az 6 karakter olmalıdır'
      }, { status: 400 })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update super admin password using raw SQL to avoid Prisma issues
    await prisma.$executeRaw`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE id = ${user.id} AND role = 'SUPER_ADMIN'
    `

    console.log('✅ Super admin password changed successfully')

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi',
      security: {
        passwordHashed: true,
        bcryptRounds: 12,
        note: 'Password is securely hashed and stored'
      }
    })

  } catch (error) {
    console.error('❌ Failed to change super admin password:', error)

    return NextResponse.json({
      success: false,
      error: 'Şifre değiştirilirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
