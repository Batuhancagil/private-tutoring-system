import { Resource, Lesson } from './types'

/**
 * Get resources for a specific topic with question counts
 */
export const getResourcesForTopic = (topicId: string, resources: Resource[]) => {
  interface ResourceWithQuestionCount {
    id: string;
    name: string;
    description: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    lessons: Resource['lessons'];
    questionCount: number;
    resourceTopicId: string;
  }

  const result: ResourceWithQuestionCount[] = []

  resources.forEach(resource => {
    // Check if resource has lessons and it's an array
    if (!resource.lessons || !Array.isArray(resource.lessons)) {
      return
    }

    resource.lessons.forEach(resourceLesson => {
      if (!resourceLesson.lesson || !resourceLesson.topics || !Array.isArray(resourceLesson.topics)) {
        return
      }

      resourceLesson.topics.forEach(resourceTopic => {
        if (resourceTopic.topic.id === topicId) {
          // Create a resource object with the questionCount from ResourceTopic
          const resourceWithQuestionCount: ResourceWithQuestionCount = {
            id: resource.id,
            name: resource.name,
            description: resource.description,
            userId: resource.userId || 'demo-user-id',
            createdAt: new Date(resource.createdAt),
            updatedAt: resource.updatedAt ? new Date(resource.updatedAt) : new Date(),
            lessons: resource.lessons || [],
            questionCount: resourceTopic.questionCount || 0,
            resourceTopicId: resourceTopic.id
          }

          // Check if we already added this resource (avoid duplicates)
          const existingIndex = result.findIndex(r => r.id === resource.id)
          if (existingIndex >= 0) {
            // If we already have this resource, add the question count to existing
            result[existingIndex].questionCount += resourceTopic.questionCount || 0
          } else {
            result.push(resourceWithQuestionCount)
          }
        }
      })
    })
  })

  return result
}

/**
 * Dynamic color system for lessons
 * Uses database color if available, otherwise generates consistent color based on lesson name
 */
export const getLessonColor = (lesson: Lesson | string | any): string => {
  // Use color from database if available (lesson object with color property)
  if (lesson?.color) {
    return lesson.color
  }

  // Fallback: if lesson is just a string (lesson name), use predefined colors
  const lessonName = typeof lesson === 'string' ? lesson : lesson?.name || ''

  const predefinedColors: Record<string, string> = {
    'Matematik': 'blue',
    'Fizik': 'purple',
    'Kimya': 'green',
    'Biyoloji': 'emerald',
    'Türkçe': 'orange',
    'İngilizce': 'red',
    'Tarih': 'yellow',
    'Coğrafya': 'indigo',
    'Felsefe': 'pink',
    'Edebiyat': 'teal'
  }

  // If lesson has predefined color, use it
  if (predefinedColors[lessonName]) {
    return predefinedColors[lessonName]
  }

  // For new lessons, generate consistent color based on lesson name hash
  const availableColors = ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'yellow', 'indigo', 'pink', 'teal', 'cyan', 'lime', 'amber', 'rose', 'violet']

  // Simple hash function for consistent color assignment
  let hash = 0
  for (let i = 0; i < lessonName.length; i++) {
    hash = ((hash << 5) - hash + lessonName.charCodeAt(i)) & 0xffffffff
  }

  const colorIndex = Math.abs(hash) % availableColors.length
  return availableColors[colorIndex]
}

/**
 * Color class mappings for Tailwind CSS
 */
export const getColorClasses = (color: string) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    pink: 'bg-pink-50 border-pink-200 text-pink-800',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-800',
    lime: 'bg-lime-50 border-lime-200 text-lime-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800'
  }

  return colorClasses[color] || colorClasses.gray
}
