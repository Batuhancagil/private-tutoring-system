import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * POST /api/migrate
 *
 * Runs Prisma DB push to sync the database schema with the Prisma schema.
 * This is a one-time endpoint to run migrations on Railway.
 *
 * IMPORTANT: This should be protected in production!
 * For now, it's open for migration purposes.
 */
export async function POST() {
  try {
    console.log('🚀 Starting database migration...')

    // Run prisma db push to sync schema
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss')

    console.log('✅ Migration stdout:', stdout)
    if (stderr) {
      console.warn('⚠️ Migration stderr:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema synchronized successfully',
      output: stdout,
      warnings: stderr || null
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)

    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

/**
 * GET /api/migrate
 *
 * Check migration status and provide information
 */
export async function GET() {
  return NextResponse.json({
    message: 'Migration endpoint ready',
    instructions: 'Send a POST request to this endpoint to run database migration',
    warning: 'This will sync the database schema with Prisma schema (may cause data loss)',
    command: 'prisma db push --accept-data-loss'
  })
}
