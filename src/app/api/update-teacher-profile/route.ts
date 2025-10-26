import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth-helpers'

/**
 * POST /api/update-teacher-profile
 * 
 * Updates teacher profile information (name)
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
    const { name } = body

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Ad soyad gereklidir'
      }, { status: 400 })
    }

    // Update teacher profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    console.log('✅ Teacher profile updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Profil bilgileri başarıyla güncellendi',
      user: updatedUser
    })

  } catch (error) {
    console.error('❌ Failed to update teacher profile:', error)

    return NextResponse.json({
      success: false,
      error: 'Profil güncellenirken hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
