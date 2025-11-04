/**
 * Topic API Client
 * Type-safe API calls for lesson topic operations
 */

import api from '@/lib/api-client'
import {
  LessonTopicCreateRequest,
  LessonTopicUpdateRequest,
  LessonTopicResponse,
  SuccessResponse,
  PaginationParams
} from '@/types/api'

export const topicsApi = {
  /**
   * Get all topics with pagination
   */
  async getAll(params?: PaginationParams): Promise<SuccessResponse<LessonTopicResponse[]>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())

    const url = `/api/topics${queryParams.toString() ? `?${queryParams}` : ''}`
    return api.get<SuccessResponse<LessonTopicResponse[]>>(url)
  },

  /**
   * Get a single topic by ID
   */
  async getById(id: string): Promise<LessonTopicResponse> {
    return api.get<LessonTopicResponse>(`/api/topics/${id}`)
  },

  /**
   * Create a new topic
   */
  async create(data: LessonTopicCreateRequest): Promise<LessonTopicResponse> {
    return api.post<LessonTopicResponse>('/api/topics', data)
  },

  /**
   * Update a topic
   */
  async update(id: string, data: LessonTopicUpdateRequest): Promise<LessonTopicResponse> {
    return api.put<LessonTopicResponse>(`/api/topics/${id}`, data)
  },

  /**
   * Delete a topic
   */
  async delete(id: string): Promise<void> {
    return api.delete(`/api/topics/${id}`)
  },

  /**
   * Reorder topics
   */
  async reorder(lessonId: string, topicIds: string[]): Promise<void> {
    await api.put<{ success: boolean }>(`/api/topics/reorder`, { lessonId, topicIds })
  }
}
