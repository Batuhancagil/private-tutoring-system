import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import bcrypt from 'bcryptjs'

/**
 * POST /api/change-teacher-password
 * 
 * Changes teacher password (requires current password verification)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is a teacher
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Yetkilendirme gerekli'
      }, { status: 401 })
    }

    if (user.role !== 'TEACHER') {
      return NextResponse.json({
        success: false,
        error: 'Bu işlem sadece öğretmenler tarafından yapılabilir'
      }, { status: 403 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: 'Mevcut şifre ve yeni şifre gereklidir'
      }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Şifre en az 6 karakter olmalıdır'
      }, { status: 400 })
    }

    // Get current user with password
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        password: true
      }
    })

    if (!currentUser || !currentUser.password) {
      return NextResponse.json({
        success: false,
        error: 'Kullanıcı bulunamadı veya şifre ayarlanmamış'
      }, { status: 404 })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Mevcut şifre yanlış'
      }, { status: 400 })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update teacher password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword
      }
    })

    console.log('✅ Teacher password changed successfully')

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
    console.error('❌ Failed to change teacher password:', error)

    return NextResponse.json({
      success: false,
      error: 'Şifre değiştirilirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
