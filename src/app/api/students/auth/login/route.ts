import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre zorunludur' }, { status: 400 })
    }

    // Öğrenciyi e-posta ile bul
    const student = await prisma.student.findUnique({
      where: { email }
    })

    if (!student) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya şifre' }, { status: 401 })
    }

    if (!student.password) {
      return NextResponse.json({ error: 'Bu öğrenci için şifre belirlenmemiş' }, { status: 401 })
    }

    // Şifreyi doğrula
    const isValidPassword = await verifyPassword(password, student.password)
    
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Geçersiz e-posta veya şifre' }, { status: 401 })
    }

    // JWT token oluştur
    const token = jwt.sign(
      { 
        studentId: student.id, 
        email: student.email,
        name: student.name,
        type: 'student'
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      success: true,
      token,
      student: {
        id: student.id,
        name: student.name,
        email: student.email
      }
    })
  } catch (error) {
    console.error('Student login error:', error)
    return NextResponse.json({ 
      error: 'Giriş sırasında hata oluştu',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
