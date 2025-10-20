/**
 * Frontend API Client with CSRF Token Support
 * Centralized API request handling with automatic CSRF token injection
 */

import { ErrorResponse, SuccessResponse } from '@/types/api'

/**
 * Get CSRF token from cookies
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null

  const name = 'csrf-token='
  const decodedCookie = decodeURIComponent(document.cookie)
  const cookieArray = decodedCookie.split(';')

  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim()
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length)
    }
  }

  return null
}

/**
 * API request options
 */
interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipCsrf?: boolean
}

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Make an API request with automatic CSRF token handling
 */
async function apiRequest<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, headers, skipCsrf, ...rest } = options

  // Build headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers
  }

  // Add CSRF token for write operations
  const method = options.method?.toUpperCase() || 'GET'
  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)

  if (isWriteOperation && !skipCsrf) {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      requestHeaders['X-CSRF-Token'] = csrfToken
    }
  }

  // Build request config
  const config: RequestInit = {
    ...rest,
    method,
    headers: requestHeaders
  }

  // Add body for write operations
  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  try {
    const response = await fetch(url, config)

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({
        error: response.statusText || 'Unknown error'
      }))

      throw new ApiError(
        errorData.error || 'Request failed',
        response.status,
        errorData.details
      )
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T
    }

    // Parse and return JSON response
    const data = await response.json()
    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    )
  }
}

/**
 * HTTP GET request
 */
export async function get<T>(url: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'GET' })
}

/**
 * HTTP POST request
 */
export async function post<T>(
  url: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'POST', body })
}

/**
 * HTTP PUT request
 */
export async function put<T>(
  url: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'PUT', body })
}

/**
 * HTTP DELETE request
 */
export async function del<T>(url: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'DELETE' })
}

/**
 * HTTP PATCH request
 */
export async function patch<T>(
  url: string,
  body?: unknown,
  options?: ApiRequestOptions
): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'PATCH', body })
}

/**
 * Export default api client
 */
export const api = {
  get,
  post,
  put,
  delete: del,
  patch
}

export default api
