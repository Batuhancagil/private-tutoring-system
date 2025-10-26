import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth-helpers'

/**
 * POST /api/add-updated-at-column
 * 
 * Adds updatedAt column to users table using raw SQL
 * This is needed because Prisma can't query a column that doesn't exist yet
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require super admin authentication
    const { user, response } = await requireSuperAdmin()
    if (response) return response

    console.log('🔄 Adding updatedAt column to users table...')

    // Use raw SQL to add the updatedAt column
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`

    console.log('✅ UpdatedAt column added successfully')

    return NextResponse.json({
      success: true,
      message: 'UpdatedAt column added successfully',
      note: 'All existing users will have their updatedAt set to current timestamp'
    })

  } catch (error) {
    console.error('❌ Failed to add updatedAt column:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to add updatedAt column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/add-updated-at-column
 * 
 * Check if the updatedAt column exists
 */
export async function GET(request: NextRequest) {
  try {
    // Check if the updatedAt column exists
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'updatedAt';
    `
    const hasUpdatedAtColumn = result.length > 0

    return NextResponse.json({
      success: true,
      hasUpdatedAtColumn,
      message: hasUpdatedAtColumn ? 'UpdatedAt column exists in users table' : 'UpdatedAt column does NOT exist in users table'
    })
  } catch (error) {
    console.error('❌ Failed to check migration status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
