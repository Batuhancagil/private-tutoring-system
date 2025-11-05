import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { handleAPIError, createSuccessResponse, createErrorResponse } from '@/lib/error-handler'

const execAsync = promisify(exec)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildPrismaCommand(subcommand: string) {
  const prismaBinary = process.platform === 'win32'
    ? 'node_modules/.bin/prisma.cmd'
    : 'node_modules/.bin/prisma'

  return `${path.join(process.cwd(), prismaBinary)} ${subcommand}`
}

async function runPrismaCommand(command: string) {
  return execAsync(command, {
    env: process.env,
  })
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireSuperAdmin()
    if (!user) return response

    const migrateCommand = buildPrismaCommand('migrate deploy')
    try {
      const { stdout, stderr } = await runPrismaCommand(migrateCommand)

      const payload = {
        success: true,
        method: 'migrate deploy',
        stdout: stdout?.trim() ?? '',
        stderr: stderr?.trim() ?? '',
      }

      const successResponse = createSuccessResponse(payload)
      return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
    } catch (migrateError: any) {
      const stderr = typeof migrateError?.stderr === 'string' ? migrateError.stderr : ''
      const stdout = typeof migrateError?.stdout === 'string' ? migrateError.stdout : ''

      // Fallback: if migrate deploy fails because database is not empty (P3005), use db push instead
      if (stderr.includes('P3005')) {
        const dbPushCommand = buildPrismaCommand('db push --accept-data-loss --skip-generate')
        try {
          const { stdout: pushStdout, stderr: pushStderr } = await runPrismaCommand(dbPushCommand)

          const payload = {
            success: true,
            method: 'db push',
            stdout: pushStdout?.trim() ?? '',
            stderr: pushStderr?.trim() ?? '',
            note: 'migrate deploy failed with P3005; a fallback prisma db push was executed instead.',
          }

          const successResponse = createSuccessResponse(payload)
          return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
        } catch (pushError: any) {
          const payload = {
            message: pushError?.message ?? 'Migration fallback failed',
            migrateStdout: stdout.trim(),
            migrateStderr: stderr.trim(),
            dbPushStdout: typeof pushError?.stdout === 'string' ? pushError.stdout.trim() : '',
            dbPushStderr: typeof pushError?.stderr === 'string' ? pushError.stderr.trim() : '',
            hint: 'Verify DATABASE_URL points to the reachable instance, or baseline the database as described in https://pris.ly/d/migrate-baseline.',
          }

          const errorResponse = createErrorResponse('Migrasyon komutu başarısız oldu', 500, payload)
          return addRateLimitHeaders(errorResponse, request, RateLimitPresets.STRICT)
        }
      }

      const payload = {
        message: migrateError?.message ?? 'Migration command failed',
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      }

      const errorResponse = createErrorResponse('Migrasyon komutu başarısız oldu', 500, payload)
      return addRateLimitHeaders(errorResponse, request, RateLimitPresets.STRICT)
    }
  } catch (error) {
    return handleAPIError(error, 'Run migrations')
  }
}
