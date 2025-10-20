import { NextRequest, NextResponse } from 'next/server'
import { withCsrfToken } from './lib/csrf'

/**
 * Next.js Middleware
 *
 * This middleware runs on every request before it reaches your application.
 * Use it for:
 * - Setting CSRF tokens
 * - Authentication checks
 * - Redirects
 * - Headers modification
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next()

  // Add CSRF token to all responses
  // This ensures every page has a CSRF token cookie
  withCsrfToken(response)

  return response
}

/**
 * Configure which routes middleware should run on
 *
 * Matcher patterns:
 * - /api/* - All API routes
 * - /dashboard/* - All dashboard pages
 * - /((?!_next|api/auth).*)  - All routes except Next.js internals and auth
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}
