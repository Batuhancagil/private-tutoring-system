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

// ============================================
// Student types
// ============================================

export interface StudentCreateRequest {
  name: string
  email: string       // Now required
  password: string    // Now required
  phone?: string
  parentName?: string
  parentPhone?: string
  notes?: string
  status?: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED'
}

export type StudentUpdateRequest = Partial<StudentCreateRequest>

export interface StudentResponse {
  id: string
  name: string
  email: string
  phone: string | null
  parentName: string | null
  parentPhone: string | null
  notes: string | null
  teacherId: string              // userId → teacherId
  status: string
  enrolledAt: string
  createdAt: string
  updatedAt: string
}

// ============================================
// Lesson types
// ============================================

export interface LessonCreateRequest {
  name: string
  lessonGroup: string           // group → lessonGroup
  lessonExamType?: string       // type → lessonExamType (now flexible string)
  lessonSubject?: string        // subject → lessonSubject
  color?: 'blue' | 'purple' | 'green' | 'emerald' | 'orange' | 'red' | 'gray'
}

export type LessonUpdateRequest = Partial<LessonCreateRequest>

export interface LessonResponse {
  id: string
  name: string
  lessonGroup: string           // group → lessonGroup
  lessonExamType: string        // type → lessonExamType
  lessonSubject: string | null  // subject → lessonSubject
  color: string
  teacherId: string             // userId → teacherId
  createdAt: string
  updatedAt: string
  topics?: LessonTopicResponse[]  // TopicResponse → LessonTopicResponse
}

// ============================================
// LessonTopic types (Topic → LessonTopic)
// ============================================

export interface LessonTopicCreateRequest {
  lessonTopicName: string       // name → lessonTopicName
  lessonTopicOrder?: number     // order → lessonTopicOrder (now optional, auto-calculated)
  lessonId: string
}

export type LessonTopicUpdateRequest = Partial<LessonTopicCreateRequest>

export interface LessonTopicResponse {
  id: string
  lessonTopicName: string       // name → lessonTopicName
  lessonTopicOrder: number      // order → lessonTopicOrder
  lessonId: string
  createdAt: string
  updatedAt: string
}

// ============================================
// Resource types
// ============================================

export interface ResourceCreateRequest {
  resourceName: string                    // name → resourceName
  resourceDescription?: string            // description → resourceDescription
}

export type ResourceUpdateRequest = Partial<ResourceCreateRequest>

export interface ResourceResponse {
  id: string
  resourceName: string                    // name → resourceName
  resourceDescription: string | null      // description → resourceDescription
  teacherId: string                       // userId → teacherId
  createdAt: string
  updatedAt: string
}

// ============================================
// ResourceTopic types
// ============================================

export interface ResourceTopicCreateRequest {
  resourceId: string
  topicId: string
  resourceLessonId: string
  resourceTopicQuestionCount?: number     // questionCount → resourceTopicQuestionCount
  resourceTopicTestCount?: number         // NEW field
}

export type ResourceTopicUpdateRequest = Partial<Omit<ResourceTopicCreateRequest, 'resourceId' | 'topicId' | 'resourceLessonId'>>

export interface ResourceTopicResponse {
  id: string
  resourceId: string
  topicId: string
  resourceLessonId: string
  resourceTopicQuestionCount: number      // questionCount → resourceTopicQuestionCount
  resourceTopicTestCount: number          // NEW field
  createdAt: string
}

// ============================================
// StudentAssignment types (Assignment → StudentAssignment)
// ============================================

export interface StudentAssignmentCreateRequest {
  studentId: string
  lessonTopicId: string                                     // topicId → lessonTopicId
  studentAssignedResourceTopicQuestionCounts?: Record<string, number>  // questionCounts → studentAssignedResourceTopicQuestionCounts
}

export interface StudentAssignmentUpdateRequest {
  completed?: boolean
  studentAssignmentCompletedAt?: string                     // NEW field
  studentAssignedResourceTopicQuestionCounts?: Record<string, number>
}

export interface StudentAssignmentResponse {
  id: string
  studentId: string
  lessonTopicId: string                                     // topicId → lessonTopicId
  assignedAt: string
  completed: boolean
  studentAssignmentCompletedAt: string | null               // NEW field
  studentAssignedResourceTopicQuestionCounts?: Record<string, number>
}

// ============================================
// StudentProgress types (Progress → StudentProgress)
// ============================================

export interface StudentProgressUpdateRequest {
  studentId: string
  studentAssignmentId: string                               // assignmentId → studentAssignmentId
  resourceId: string
  lessonTopicId: string                                     // topicId → lessonTopicId
  studentProgressSolvedCount?: number                       // solvedCount → studentProgressSolvedCount
  studentProgressCorrectCount?: number                      // correctCount → studentProgressCorrectCount
  studentProgressWrongCount?: number                        // wrongCount → studentProgressWrongCount
  studentProgressEmptyCount?: number                        // emptyCount → studentProgressEmptyCount
}

export interface StudentProgressResponse {
  id: string
  studentId: string
  studentAssignmentId: string                               // assignmentId → studentAssignmentId
  resourceId: string
  lessonTopicId: string                                     // topicId → lessonTopicId
  studentProgressSolvedCount: number                        // solvedCount → studentProgressSolvedCount
  studentProgressCorrectCount: number                       // correctCount → studentProgressCorrectCount
  studentProgressWrongCount: number                         // wrongCount → studentProgressWrongCount
  studentProgressEmptyCount: number                         // emptyCount → studentProgressEmptyCount
  studentProgressLastSolvedAt: string                       // lastSolvedAt → studentProgressLastSolvedAt
  createdAt: string
  updatedAt: string
}

// ============================================
// StudentTopicSchedule types (NEW - replaces WeeklySchedule)
// ============================================

export interface StudentTopicScheduleCreateRequest {
  studentId: string
  studentAssignmentId: string
  scheduleOrder: number
  estimatedDays?: number        // Default: 7
  startDate?: string            // Auto-calculated if not provided
  endDate?: string              // Auto-calculated if not provided
}

export interface StudentTopicScheduleUpdateRequest {
  scheduleOrder?: number
  estimatedDays?: number
  startDate?: string
  endDate?: string
  isActive?: boolean
  isCompleted?: boolean
}

export interface StudentTopicScheduleResponse {
  id: string
  studentId: string
  studentAssignmentId: string
  scheduleOrder: number
  estimatedDays: number
  startDate: string | null
  endDate: string | null
  isActive: boolean
  isCompleted: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}
