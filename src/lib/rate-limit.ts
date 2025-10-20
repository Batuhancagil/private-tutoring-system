import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse } from './error-handler'

/**
 * Rate Limiting for Next.js App Router
 *
 * Simple in-memory rate limiter using sliding window algorithm
 *
 * For production with multiple instances, consider:
 * - Redis-based rate limiting (upstash/ratelimit)
 * - Edge rate limiting (Vercel Edge Config)
 * - Database-based rate limiting
 *
 * This implementation is suitable for:
 * - Development
 * - Single-instance deployments
 * - Low to medium traffic
 */

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number

  /**
   * Time window in milliseconds
   */
  windowMs: number

  /**
   * Custom error message
   */
  message?: string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limit data
// Format: Map<identifier, RateLimitEntry>
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup interval: remove expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000

// Start cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
}

/**
 * Get identifier for rate limiting
 * Uses IP address or a fallback
 */
function getIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')

  const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown'

  // Include path for per-endpoint rate limiting
  const path = new URL(request.url).pathname

  return `${ip}:${path}`
}

/**
 * Check if request is rate limited
 * Returns null if allowed, NextResponse if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const identifier = getIdentifier(request)
  const now = Date.now()

  // Get or create entry
  let entry = rateLimitStore.get(identifier)

  // If no entry or expired, create new one
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs
    }
    rateLimitStore.set(identifier, entry)
    return null // First request, allow
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

    const response = createErrorResponse(
      config.message || 'Too many requests',
      429,
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    )

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())
    response.headers.set('Retry-After', retryAfter.toString())

    return response
  }

  // Update entry
  rateLimitStore.set(identifier, entry)

  return null // Request allowed
}

/**
 * Rate limit middleware
 * Use this in API routes that need rate limiting
 */
export function requireRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  return checkRateLimit(request, config)
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  config: RateLimitConfig
): NextResponse {
  const identifier = getIdentifier(request)
  const entry = rateLimitStore.get(identifier)

  if (entry) {
    const remaining = Math.max(0, config.maxRequests - entry.count)
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', entry.resetTime.toString())
  }

  return response
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts'
  },

  /**
   * Standard rate limit for API endpoints
   * 100 requests per minute
   */
  STANDARD: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests'
  },

  /**
   * Strict rate limit for write operations
   * 30 requests per minute
   */
  STRICT: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests'
  },

  /**
   * Lenient rate limit for read operations
   * 300 requests per minute
   */
  LENIENT: {
    maxRequests: 300,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests'
  }
} as const

/**
 * Clear all rate limit data (useful for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear()
}

/**
 * Get current rate limit stats (useful for monitoring)
 */
export function getRateLimitStats(): {
  totalEntries: number
  entries: Array<{ identifier: string; count: number; resetTime: number }>
} {
  return {
    totalEntries: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([identifier, entry]) => ({
      identifier,
      count: entry.count,
      resetTime: entry.resetTime
    }))
  }
}
