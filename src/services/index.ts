/**
 * Service layer exports
 *
 * All business logic should be handled through these services.
 * API routes should be thin controllers that validate input and call services.
 */

export { BaseService } from './base.service'
export { StudentService } from './student.service'
export { LessonService } from './lesson.service'

// Service instances for easy import
export const studentService = new StudentService()
export const lessonService = new LessonService()
