/**
 * Student API Client
 * Type-safe API calls for student operations
 */

import api from '@/lib/api-client'
import {
  StudentCreateRequest,
  StudentUpdateRequest,
  StudentResponse,
  SuccessResponse,
  PaginationParams
} from '@/types/api'

export const studentsApi = {
  /**
   * Get all students with pagination
   */
  async getAll(params?: PaginationParams): Promise<SuccessResponse<StudentResponse[]>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())

    const url = `/api/students${queryParams.toString() ? `?${queryParams}` : ''}`
    return api.get<SuccessResponse<StudentResponse[]>>(url)
  },

  /**
   * Get a single student by ID
   */
  async getById(id: string): Promise<StudentResponse> {
    return api.get<StudentResponse>(`/api/students/${id}`)
  },

  /**
   * Create a new student
   */
  async create(data: StudentCreateRequest): Promise<StudentResponse> {
    return api.post<StudentResponse>('/api/students', data)
  },

  /**
   * Update a student
   */
  async update(id: string, data: StudentUpdateRequest): Promise<StudentResponse> {
    return api.put<StudentResponse>(`/api/students/${id}`, data)
  },

  /**
   * Delete a student
   */
  async delete(id: string): Promise<void> {
    return api.delete(`/api/students/${id}`)
  }
}
