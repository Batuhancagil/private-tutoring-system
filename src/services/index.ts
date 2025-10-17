/**
 * Service layer exports
 *
 * All business logic should be handled through these services.
 * API routes should be thin controllers that validate input and call services.
 */

// Import classes first
import { StudentService } from './student.service'
import { LessonService } from './lesson.service'
import { LessonTopicService } from './lesson-topic.service'
import { ResourceService } from './resource.service'

// Export classes
export { BaseService } from './base.service'
export { StudentService } from './student.service'
export { LessonService } from './lesson.service'
export { LessonTopicService } from './lesson-topic.service'
export { ResourceService } from './resource.service'

// Service instances for easy import
export const studentService = new StudentService()
export const lessonService = new LessonService()
export const lessonTopicService = new LessonTopicService()
export const resourceService = new ResourceService()
