export interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  parentName: string | null
  parentPhone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Lesson {
  id: string
  name: string
  group: string
  type: string
  subject: string | null
  topics: Topic[]
  createdAt: string
}

export interface Topic {
  id: string
  name: string
  order: number
  lessonId: string
  createdAt: string
}

export interface StudentAssignment {
  id: string
  studentId: string
  topicId: string
  assignedAt: string
  completed: boolean
  questionCounts?: Record<string, Record<string, number>>
}

export interface ProgressData {
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

export interface Resource {
  id: string
  name: string
  description: string
  userId?: string
  lessonIds: string[]
  questionCount: number
  createdAt: string
  updatedAt?: string
  lessons?: Array<{
    id: string
    resourceId: string
    lessonId: string
    lesson: {
      id: string
      name: string
      group: string
      type: string
      subject: string | null
      topics: Topic[]
    }
    topics: Array<{
      id: string
      resourceId: string
      topicId: string
      resourceLessonId: string
      questionCount: number
      topic: Topic
    }>
  }>
}

export interface AssignmentWithDetails {
  id: string
  studentId: string
  topicId: string
  assignedAt: string
  completed: boolean
  questionCounts?: Record<string, Record<string, number>>
  topic: Topic
  lesson: Lesson
}

export interface WeeklySchedule {
  id: string
  title: string
  startDate: string
  endDate: string
  isActive: boolean
  weekPlans: WeekPlan[]
}

export interface WeekPlan {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  weekTopics: WeekTopic[]
}

export interface WeekTopic {
  id: string
  topicOrder: number
  isCompleted: boolean
  assignmentId: string
  assignment: {
    id: string
    topicId: string
    questionCounts?: Record<string, Record<string, number>>
    topic: {
      id: string
      name: string
      order: number
      lesson: {
        id: string
        name: string
      }
    }
  }
}

// Resource with question count for a specific topic
export interface ResourceWithQuestionCount {
  id: string
  name: string
  description: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  lessons: Resource['lessons']
  questionCount: number
  resourceTopicId: string
}

