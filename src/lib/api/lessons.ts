/**
 * Lesson API Client
 * Type-safe API calls for lesson operations
 */

import api from '@/lib/api-client'
import {
  LessonCreateRequest,
  LessonUpdateRequest,
  LessonResponse,
  SuccessResponse,
  PaginationParams
} from '@/types/api'

export const lessonsApi = {
  /**
   * Get all lessons with pagination
   */
  async getAll(params?: PaginationParams): Promise<SuccessResponse<LessonResponse[]>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())

    const url = `/api/lessons${queryParams.toString() ? `?${queryParams}` : ''}`
    return api.get<SuccessResponse<LessonResponse[]>>(url)
  },

  /**
   * Get a single lesson by ID
   */
  async getById(id: string): Promise<LessonResponse> {
    return api.get<LessonResponse>(`/api/lessons/${id}`)
  },

  /**
   * Create a new lesson
   */
  async create(data: LessonCreateRequest): Promise<LessonResponse> {
    return api.post<LessonResponse>('/api/lessons', data)
  },

  /**
   * Update a lesson
   */
  async update(id: string, data: LessonUpdateRequest): Promise<LessonResponse> {
    return api.put<LessonResponse>(`/api/lessons/${id}`, data)
  },

  /**
   * Delete a lesson
   */
  async delete(id: string): Promise<void> {
    return api.delete(`/api/lessons/${id}`)
  }
}
