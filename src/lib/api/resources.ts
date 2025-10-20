/**
 * Resource API Client
 * Type-safe API calls for resource operations
 */

import api from '@/lib/api-client'
import {
  ResourceCreateRequest,
  ResourceUpdateRequest,
  ResourceResponse,
  SuccessResponse,
  PaginationParams
} from '@/types/api'

export const resourcesApi = {
  /**
   * Get all resources with pagination
   */
  async getAll(params?: PaginationParams): Promise<SuccessResponse<ResourceResponse[]>> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())

    const url = `/api/resources${queryParams.toString() ? `?${queryParams}` : ''}`
    return api.get<SuccessResponse<ResourceResponse[]>>(url)
  },

  /**
   * Get a single resource by ID
   */
  async getById(id: string): Promise<ResourceResponse> {
    return api.get<ResourceResponse>(`/api/resources/${id}`)
  },

  /**
   * Create a new resource
   */
  async create(data: ResourceCreateRequest): Promise<ResourceResponse> {
    return api.post<ResourceResponse>('/api/resources', data)
  },

  /**
   * Update a resource
   */
  async update(id: string, data: ResourceUpdateRequest): Promise<ResourceResponse> {
    return api.put<ResourceResponse>(`/api/resources/${id}`, data)
  },

  /**
   * Delete a resource
   */
  async delete(id: string): Promise<void> {
    return api.delete(`/api/resources/${id}`)
  }
}
