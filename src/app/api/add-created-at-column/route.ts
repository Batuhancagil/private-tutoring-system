import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth-helpers'

/**
 * POST /api/add-created-at-column
 * 
 * Adds createdAt column to users table using raw SQL
 * This is needed because Prisma can't query a column that doesn't exist yet
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require super admin authentication
    const { user, response } = await requireSuperAdmin()
    if (response) return response

    console.log('🔄 Adding createdAt column to users table...')

    // Use raw SQL to add the createdAt column
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`

    console.log('✅ CreatedAt column added successfully')

    return NextResponse.json({
      success: true,
      message: 'CreatedAt column added successfully',
      note: 'All existing users will have their createdAt set to current timestamp'
    })

  } catch (error) {
    console.error('❌ Failed to add createdAt column:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to add createdAt column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/add-created-at-column
 * 
 * Check if the createdAt column exists
 */
export async function GET(request: NextRequest) {
  try {
    // Check if the createdAt column exists
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'createdAt';
    `
    const hasCreatedAtColumn = result.length > 0

    return NextResponse.json({
      success: true,
      hasCreatedAtColumn,
      message: hasCreatedAtColumn ? 'CreatedAt column exists in users table' : 'CreatedAt column does NOT exist in users table'
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
