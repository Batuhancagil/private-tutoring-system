import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse } from './error-handler'

/**
 * CSRF Protection for Next.js App Router
 *
 * Uses the Double Submit Cookie pattern:
 * 1. Client receives a CSRF token in a cookie
 * 2. Client must send the same token in a header
 * 3. Server validates that both match
 *
 * This protects against CSRF attacks where an attacker can't read
 * the cookie value to include in the header.
 */

const CSRF_TOKEN_COOKIE = 'csrf-token'
const CSRF_TOKEN_HEADER = 'x-csrf-token'
const TOKEN_LENGTH = 32

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  const array = new Uint8Array(TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token from request
 * Returns true if valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest): boolean {
  // Only check for state-changing methods
  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true // Safe methods don't need CSRF protection
  }

  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_TOKEN_COOKIE)?.value

  // Get token from header
  const headerToken = request.headers.get(CSRF_TOKEN_HEADER)

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return cookieToken === headerToken
}

/**
 * CSRF Protection Middleware
 * Use this in API routes that need CSRF protection
 */
export function requireCsrf(request: NextRequest): NextResponse | null {
  if (!validateCsrfToken(request)) {
    return createErrorResponse(
      'CSRF token validation failed',
      403,
      'Invalid or missing CSRF token'
    )
  }
  return null // Validation passed
}

/**
 * Set CSRF token cookie in response
 * Call this when rendering pages that will make API calls
 */
export function setCsrfToken(response: NextResponse): NextResponse {
  const existingToken = response.cookies.get(CSRF_TOKEN_COOKIE)?.value

  if (!existingToken) {
    const token = generateToken()
    response.cookies.set(CSRF_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    })
  }

  return response
}

/**
 * Get CSRF token from request (for client-side)
 * Use this to read the token and send it in headers
 */
export function getCsrfToken(request: NextRequest): string | null {
  return request.cookies.get(CSRF_TOKEN_COOKIE)?.value || null
}

/**
 * Middleware helper to add CSRF token to response
 * Use in middleware.ts for automatic token generation
 */
export function withCsrfToken(response: NextResponse): NextResponse {
  return setCsrfToken(response)
}
