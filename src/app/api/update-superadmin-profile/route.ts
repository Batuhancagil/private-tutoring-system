import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth-helpers'

/**
 * POST /api/update-superadmin-profile
 * 
 * Updates super admin profile information (name, email)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if user is super admin
    const { user, response } = await requireSuperAdmin()
    if (response) return response

    const body = await request.json()
    const { name, email } = body

    if (!name || !email) {
      return NextResponse.json({
        success: false,
        error: 'Name and email are required'
      }, { status: 400 })
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: user.id }
      },
      select: {
        id: true,
        email: true
      }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor'
      }, { status: 400 })
    }

    // Update super admin profile
    console.log('🔄 Updating user profile:', { userId: user.id, name, email })
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name,
        email: email
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    console.log('✅ Super admin profile updated successfully:', updatedUser)

    return NextResponse.json({
      success: true,
      message: 'Profil bilgileri başarıyla güncellendi',
      user: updatedUser
    })

  } catch (error) {
    console.error('❌ Failed to update super admin profile:', error)

    return NextResponse.json({
      success: false,
      error: 'Profil güncellenirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/update-superadmin-profile
 * 
 * Get current super admin profile information
 */
export async function GET() {
  try {
    // Check if user is super admin
    const { user, response } = await requireSuperAdmin()
    if (response) return response

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {
    console.error('❌ Failed to get super admin profile:', error)

    return NextResponse.json({
      success: false,
      error: 'Profil bilgileri alınırken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
