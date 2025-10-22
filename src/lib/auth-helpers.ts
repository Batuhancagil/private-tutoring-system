import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { createUnauthorizedResponse, createForbiddenResponse } from './error-handler'

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
    name: session.user.name,
    role: session.user.role || 'TEACHER'
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

/**
 * Require super admin authentication
 * Returns user if authenticated and is super admin, otherwise returns error response
 */
export async function requireSuperAdmin() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return { user: null, response: createUnauthorizedResponse() }
  }

  if (user.role !== 'SUPER_ADMIN') {
    return {
      user: null,
      response: createForbiddenResponse('Only super admin can perform this action')
    }
  }

  return { user, response: null }
}
