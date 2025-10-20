/**
 * API Client Index
 * Central export for all API clients
 */

export { studentsApi } from './students'
export { lessonsApi } from './lessons'
export { topicsApi } from './topics'
export { resourcesApi } from './resources'

// Re-export base API client for custom requests
export { default as api, ApiError } from '@/lib/api-client'
