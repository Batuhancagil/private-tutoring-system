import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

/**
 * Get authenticated user session
 * Throws error if user is not authenticated
 */
export async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user || !session.user.id) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name
  }
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized. Please login.') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}

/**
 * Require authentication middleware
 * Returns user if authenticated, otherwise returns unauthorized response
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return { user: null, response: unauthorizedResponse() }
  }

  return { user, response: null }
}
