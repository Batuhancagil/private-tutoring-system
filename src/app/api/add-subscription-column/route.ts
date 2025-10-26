import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/auth-helpers'

/**
 * POST /api/add-subscription-column
 * 
 * Adds subscriptionEndDate column to users table using raw SQL
 * Sets default subscription end date to 1 year from now for existing teachers
 */
export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Require super admin authentication
    const { user, response } = await requireSuperAdmin()
    if (response) return response

    console.log('🔄 Adding subscriptionEndDate column to users table...')

    // Use raw SQL to add the subscriptionEndDate column
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS "subscriptionEndDate" TIMESTAMP;`

    // Set default subscription end date for existing teachers (1 year from now)
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

    await prisma.$executeRaw`
      UPDATE users 
      SET "subscriptionEndDate" = ${oneYearFromNow}
      WHERE role = 'TEACHER' AND "subscriptionEndDate" IS NULL;
    `

    console.log('✅ SubscriptionEndDate column added successfully')

    return NextResponse.json({
      success: true,
      message: 'SubscriptionEndDate column added successfully',
      details: {
        defaultSubscriptionEndDate: oneYearFromNow.toISOString(),
        note: 'All existing teachers have been given a 1-year subscription'
      }
    })

  } catch (error) {
    console.error('❌ Failed to add subscriptionEndDate column:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to add subscriptionEndDate column',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/add-subscription-column
 * 
 * Check if the subscriptionEndDate column exists
 */
export async function GET(request: NextRequest) {
  try {
    // Check if the subscriptionEndDate column exists
    const result = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'subscriptionEndDate';
    `
    const hasSubscriptionColumn = result.length > 0

    return NextResponse.json({
      success: true,
      hasSubscriptionColumn,
      message: hasSubscriptionColumn 
        ? 'SubscriptionEndDate column exists in users table' 
        : 'SubscriptionEndDate column does NOT exist in users table'
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
