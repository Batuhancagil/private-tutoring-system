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

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireSuperAdmin()
    if (!user) return response

    const prismaBinary = process.platform === 'win32'
      ? 'node_modules/.bin/prisma.cmd'
      : 'node_modules/.bin/prisma'

    const prismaCommand = `${path.join(process.cwd(), prismaBinary)} migrate deploy`

    const { stdout, stderr } = await execAsync(prismaCommand, {
      env: process.env,
    })

    const payload = {
      success: true,
      stdout: stdout?.trim() ?? '',
      stderr: stderr?.trim() ?? '',
    }

    const successResponse = createSuccessResponse(payload)
    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error: any) {
    if (error?.stdout || error?.stderr) {
      const stdout = typeof error.stdout === 'string' ? error.stdout.trim() : ''
      const stderr = typeof error.stderr === 'string' ? error.stderr.trim() : ''
      const message = error?.message ?? 'Migration command failed'

      const errorResponse = createErrorResponse('Migrasyon komutu başarısız oldu', 500, {
        message,
        stdout,
        stderr,
      })

      return addRateLimitHeaders(errorResponse, request, RateLimitPresets.STRICT)
    }

    return handleAPIError(error, 'Run migrations')
  }
}
