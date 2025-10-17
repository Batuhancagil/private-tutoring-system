import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { createUnauthorizedResponse } from './error-handler'

/**
 * Get authenticated user session
 * Returns user data if authenticated, null otherwise
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
 * Require authentication middleware
 * Returns user if authenticated, otherwise returns unauthorized response
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return { user: null, response: createUnauthorizedResponse() }
  }

  return { user, response: null }
}
