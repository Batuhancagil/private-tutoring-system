/**
 * Data Transformers
 *
 * This module provides transformation functions to convert between
 * Database field names (Prisma schema) and API field names (client-facing).
 *
 * Why? Database uses prefixed field names for clarity (lessonGroup, lessonTopicName)
 * but API should use simpler, more intuitive names (group, name).
 *
 * Benefits:
 * - Cleaner API interface
 * - Centralized mapping logic
 * - Type-safe transformations
 * - Easy to maintain
 */

// ============================================
// Lesson Transformers
// ============================================

export interface LessonDB {
  id: string
  name: string
  lessonGroup: string
  lessonExamType: string
  lessonSubject: string | null
  color: string
  teacherId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface LessonAPI {
  id: string
  name: string
  group: string
  type: string
  subject: string | null
  color: string
  teacherId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export function transformLessonToAPI(lesson: LessonDB): LessonAPI {
  return {
    id: lesson.id,
    name: lesson.name,
    group: lesson.lessonGroup,
    type: lesson.lessonExamType,
    subject: lesson.lessonSubject,
    color: lesson.color,
    teacherId: lesson.teacherId,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt
  }
}

export function transformLessonFromAPI(lesson: Partial<LessonAPI>): Partial<LessonDB> {
  const transformed: Partial<LessonDB> = {}

  if (lesson.name !== undefined) transformed.name = lesson.name
  if (lesson.group !== undefined) transformed.lessonGroup = lesson.group
  if (lesson.type !== undefined) transformed.lessonExamType = lesson.type
  if (lesson.subject !== undefined) transformed.lessonSubject = lesson.subject
  if (lesson.color !== undefined) transformed.color = lesson.color

  return transformed
}

// ============================================
// LessonTopic Transformers
// ============================================

export interface LessonTopicDB {
  id: string
  lessonTopicName: string
  lessonTopicOrder: number
  lessonId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface LessonTopicAPI {
  id: string
  name: string
  order: number
  lessonId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export function transformTopicToAPI(topic: LessonTopicDB): LessonTopicAPI {
  return {
    id: topic.id,
    name: topic.lessonTopicName,
    order: topic.lessonTopicOrder,
    lessonId: topic.lessonId,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt
  }
}

export function transformTopicFromAPI(topic: Partial<LessonTopicAPI>): Partial<LessonTopicDB> {
  const transformed: Partial<LessonTopicDB> = {}

  if (topic.name !== undefined) transformed.lessonTopicName = topic.name
  if (topic.order !== undefined) transformed.lessonTopicOrder = topic.order
  if (topic.lessonId !== undefined) transformed.lessonId = topic.lessonId

  return transformed
}

// ============================================
// Resource Transformers
// ============================================

export interface ResourceDB {
  id: string
  resourceName: string
  resourceDescription: string | null
  teacherId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface ResourceAPI {
  id: string
  name: string
  description: string | null
  teacherId: string
  createdAt: Date | string
  updatedAt: Date | string
}

export function transformResourceToAPI(resource: ResourceDB): ResourceAPI {
  return {
    id: resource.id,
    name: resource.resourceName,
    description: resource.resourceDescription,
    teacherId: resource.teacherId,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt
  }
}

export function transformResourceFromAPI(resource: Partial<ResourceAPI>): Partial<ResourceDB> {
  const transformed: Partial<ResourceDB> = {}

  if (resource.name !== undefined) transformed.resourceName = resource.name
  if (resource.description !== undefined) transformed.resourceDescription = resource.description

  return transformed
}

// ============================================
// StudentAssignment Transformers
// ============================================

export interface StudentAssignmentDB {
  id: string
  studentId: string
  lessonTopicId: string
  assignedAt: Date | string
  completed: boolean
  studentAssignmentCompletedAt: Date | string | null
  studentAssignedResourceTopicQuestionCounts: unknown // JSON
}

export interface StudentAssignmentAPI {
  id: string
  studentId: string
  topicId: string
  assignedAt: Date | string
  completed: boolean
  completedAt: Date | string | null
  questionCounts: unknown // JSON
}

export function transformAssignmentToAPI(assignment: StudentAssignmentDB): StudentAssignmentAPI {
  return {
    id: assignment.id,
    studentId: assignment.studentId,
    topicId: assignment.lessonTopicId,
    assignedAt: assignment.assignedAt,
    completed: assignment.completed,
    completedAt: assignment.studentAssignmentCompletedAt,
    questionCounts: assignment.studentAssignedResourceTopicQuestionCounts
  }
}

export function transformAssignmentFromAPI(assignment: Partial<StudentAssignmentAPI>): Partial<StudentAssignmentDB> {
  const transformed: Partial<StudentAssignmentDB> = {}

  if (assignment.studentId !== undefined) transformed.studentId = assignment.studentId
  if (assignment.topicId !== undefined) transformed.lessonTopicId = assignment.topicId
  if (assignment.completed !== undefined) transformed.completed = assignment.completed
  if (assignment.completedAt !== undefined) transformed.studentAssignmentCompletedAt = assignment.completedAt
  if (assignment.questionCounts !== undefined) transformed.studentAssignedResourceTopicQuestionCounts = assignment.questionCounts

  return transformed
}

// ============================================
// StudentProgress Transformers
// ============================================

export interface StudentProgressDB {
  id: string
  studentId: string
  studentAssignmentId: string
  resourceId: string
  lessonTopicId: string
  studentProgressSolvedCount: number
  studentProgressCorrectCount: number
  studentProgressWrongCount: number
  studentProgressEmptyCount: number
  studentProgressLastSolvedAt: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface StudentProgressAPI {
  id: string
  studentId: string
  assignmentId: string
  resourceId: string
  topicId: string
  solvedCount: number
  correctCount: number
  wrongCount: number
  emptyCount: number
  lastSolvedAt: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

export function transformProgressToAPI(progress: StudentProgressDB): StudentProgressAPI {
  return {
    id: progress.id,
    studentId: progress.studentId,
    assignmentId: progress.studentAssignmentId,
    resourceId: progress.resourceId,
    topicId: progress.lessonTopicId,
    solvedCount: progress.studentProgressSolvedCount,
    correctCount: progress.studentProgressCorrectCount,
    wrongCount: progress.studentProgressWrongCount,
    emptyCount: progress.studentProgressEmptyCount,
    lastSolvedAt: progress.studentProgressLastSolvedAt,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt
  }
}

export function transformProgressFromAPI(progress: Partial<StudentProgressAPI>): Partial<StudentProgressDB> {
  const transformed: Partial<StudentProgressDB> = {}

  if (progress.studentId !== undefined) transformed.studentId = progress.studentId
  if (progress.assignmentId !== undefined) transformed.studentAssignmentId = progress.assignmentId
  if (progress.resourceId !== undefined) transformed.resourceId = progress.resourceId
  if (progress.topicId !== undefined) transformed.lessonTopicId = progress.topicId
  if (progress.solvedCount !== undefined) transformed.studentProgressSolvedCount = progress.solvedCount
  if (progress.correctCount !== undefined) transformed.studentProgressCorrectCount = progress.correctCount
  if (progress.wrongCount !== undefined) transformed.studentProgressWrongCount = progress.wrongCount
  if (progress.emptyCount !== undefined) transformed.studentProgressEmptyCount = progress.emptyCount

  return transformed
}

// ============================================
// Batch Transformers
// ============================================

export function transformLessonsToAPI(lessons: LessonDB[]): LessonAPI[] {
  return lessons.map(transformLessonToAPI)
}

export function transformTopicsToAPI(topics: LessonTopicDB[]): LessonTopicAPI[] {
  return topics.map(transformTopicToAPI)
}

export function transformResourcesToAPI(resources: ResourceDB[]): ResourceAPI[] {
  return resources.map(transformResourceToAPI)
}

export function transformAssignmentsToAPI(assignments: StudentAssignmentDB[]): StudentAssignmentAPI[] {
  return assignments.map(transformAssignmentToAPI)
}

export function transformProgressListToAPI(progressList: StudentProgressDB[]): StudentProgressAPI[] {
  return progressList.map(transformProgressToAPI)
}

// ============================================
// Type Guards (Runtime type checking)
// ============================================

export function isLessonDB(obj: unknown): obj is LessonDB {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'lessonGroup' in obj &&
    'lessonExamType' in obj
  )
}

export function isLessonTopicDB(obj: unknown): obj is LessonTopicDB {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'lessonTopicName' in obj &&
    'lessonTopicOrder' in obj
  )
}

export function isResourceDB(obj: unknown): obj is ResourceDB {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'resourceName' in obj
  )
}
