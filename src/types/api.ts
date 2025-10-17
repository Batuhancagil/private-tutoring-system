/**
 * Standard API types for consistent request/response handling
 */

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * Pagination metadata in responses
 */
export interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

/**
 * Standard success response wrapper
 */
export interface SuccessResponse<T> {
  data: T
  pagination?: PaginationMeta
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: string
  details?: unknown
  code?: string
}

/**
 * Query parameters for filtering
 */
export interface FilterParams {
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Common request/response types for domain entities
 */
export namespace Students {
  export interface CreateRequest {
    name: string
    email?: string
    password?: string
    phone?: string
    parentName?: string
    parentPhone?: string
    notes?: string
  }

  export interface UpdateRequest extends Partial<CreateRequest> {}

  export interface Response {
    id: string
    name: string
    email: string | null
    phone: string | null
    parentName: string | null
    parentPhone: string | null
    notes: string | null
    userId: string
    createdAt: string
    updatedAt: string
  }
}

export namespace Lessons {
  export interface CreateRequest {
    name: string
    group: string
    type?: 'TYT' | 'AYT'
    subject?: string
    color?: 'blue' | 'purple' | 'green' | 'emerald' | 'orange' | 'red' | 'gray'
  }

  export interface UpdateRequest extends Partial<CreateRequest> {}

  export interface Response {
    id: string
    name: string
    group: string
    type: string
    subject: string | null
    color: string
    userId: string
    createdAt: string
    updatedAt: string
    topics?: Topics.Response[]
  }
}

export namespace Topics {
  export interface CreateRequest {
    name: string
    order: number
    lessonId: string
  }

  export interface UpdateRequest extends Partial<CreateRequest> {}

  export interface Response {
    id: string
    name: string
    order: number
    lessonId: string
    createdAt: string
  }
}

export namespace Resources {
  export interface CreateRequest {
    name: string
    description?: string
    lessonIds?: string[]
    topicIds?: string[]
    topicQuestionCounts?: Record<string, number>
  }

  export interface UpdateRequest extends Partial<CreateRequest> {}

  export interface Response {
    id: string
    name: string
    description: string | null
    userId: string
    createdAt: string
    updatedAt: string
  }
}

export namespace Assignments {
  export interface CreateRequest {
    studentId: string
    topicId: string
    questionCounts?: Record<string, Record<string, number>>
  }

  export interface UpdateRequest {
    completed?: boolean
    questionCounts?: Record<string, Record<string, number>>
  }

  export interface Response {
    id: string
    studentId: string
    topicId: string
    assignedAt: string
    completed: boolean
    questionCounts?: Record<string, Record<string, number>>
  }
}

export namespace Progress {
  export interface UpdateRequest {
    studentId: string
    assignmentId: string
    resourceId: string
    topicId: string
    solvedCount?: number
    correctCount?: number
    wrongCount?: number
    emptyCount?: number
    increment?: number
  }

  export interface Response {
    id: string
    studentId: string
    assignmentId: string
    resourceId: string
    topicId: string
    solvedCount: number
    totalCount: number
    lastSolvedAt: string
    createdAt: string
    updatedAt: string
  }
}

export namespace WeeklySchedules {
  export interface CreateRequest {
    studentId: string
    title: string
    startDate: string
    endDate: string
    assignments?: any[]
  }

  export interface UpdateRequest {
    title?: string
    startDate?: string
    endDate?: string
    isActive?: boolean
  }

  export interface Response {
    id: string
    studentId: string
    title: string
    startDate: string
    endDate: string
    isActive: boolean
    createdAt: string
    updatedAt: string
  }
}
