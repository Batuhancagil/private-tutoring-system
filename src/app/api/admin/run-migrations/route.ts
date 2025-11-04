import { NextRequest } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { requireCsrf } from '@/lib/csrf'
import { requireRateLimit, RateLimitPresets, addRateLimitHeaders } from '@/lib/rate-limit'
import { handleAPIError, createSuccessResponse } from '@/lib/error-handler'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = requireRateLimit(request, RateLimitPresets.STRICT)
    if (rateLimitResponse) return rateLimitResponse

    const csrfResponse = requireCsrf(request)
    if (csrfResponse) return csrfResponse

    const { user, response } = await requireSuperAdmin()
    if (!user) return response

    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      env: process.env,
    })

    const payload = {
      success: true,
      stdout: stdout?.trim() ?? '',
      stderr: stderr?.trim() ?? '',
    }

    const successResponse = createSuccessResponse(payload)
    return addRateLimitHeaders(successResponse, request, RateLimitPresets.STRICT)
  } catch (error) {
    return handleAPIError(error, 'Run migrations')
  }
}
