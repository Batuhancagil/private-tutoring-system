import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

/**
 * POST /api/migrate
 *
 * Runs Prisma DB push to sync the database schema.
 *
 * IMPORTANT: This should be protected in production!
 */
export async function POST() {
  try {
    console.log('🚀 Starting database migration...')

    // Find the schema file location
    const possiblePaths = [
      './prisma/schema.prisma',
      '../prisma/schema.prisma',
      '../../prisma/schema.prisma',
      path.join(process.cwd(), 'prisma/schema.prisma'),
    ]

    let schemaPath = ''
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        schemaPath = p
        console.log(`✅ Found schema at: ${schemaPath}`)
        break
      }
    }

    if (!schemaPath) {
      // List current directory contents for debugging
      const { stdout: lsOutput } = await execAsync('ls -la && pwd')
      console.log('📁 Current directory:', lsOutput)

      return NextResponse.json({
        success: false,
        error: 'Schema file not found',
        searchedPaths: possiblePaths,
        currentDir: lsOutput
      }, { status: 500 })
    }

    // Run prisma db push
    const { stdout, stderr } = await execAsync(`npx prisma db push --accept-data-loss --schema=${schemaPath}`, {
      timeout: 60000 // 60 second timeout
    })

    console.log('✅ Migration stdout:', stdout)
    if (stderr) {
      console.warn('⚠️ Migration stderr:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema synchronized successfully',
      output: stdout,
      warnings: stderr || null,
      schemaPath
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
