import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        lessons: {
          include: {
            lesson: true
          }
        }
      }
    })

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Resource fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, description, lessonIds } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Resource'u güncelle
    const resource = await prisma.resource.update({
      where: { id },
      data: {
        name,
        description: description || null
      }
    })

    // Mevcut ders ilişkilerini sil
    await prisma.resourceLesson.deleteMany({
      where: { resourceId: id }
    })

    // Yeni ders ilişkilerini oluştur
    if (lessonIds && lessonIds.length > 0) {
      await prisma.resourceLesson.createMany({
        data: lessonIds.map((lessonId: string) => ({
          resourceId: id,
          lessonId
        }))
      })
    }

    // Güncellenmiş resource'u döndür
    const updatedResource = await prisma.resource.findUnique({
      where: { id },
      include: {
        lessons: {
          include: {
            lesson: true
          }
        }
      }
    })

    return NextResponse.json(updatedResource)
  } catch (error) {
    console.error('Resource update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Önce ders ilişkilerini sil
    await prisma.resourceLesson.deleteMany({
      where: { resourceId: id }
    })

    // Sonra resource'u sil
    await prisma.resource.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resource delete error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete resource',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
