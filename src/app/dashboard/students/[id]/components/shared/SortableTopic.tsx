'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ProgressData, Resource, ResourceWithQuestionCount } from '../../types'
import { getLessonColor, getColorClasses } from '../../utils'

interface SortableTopicProps {
  topic: any
  weekId: string
  topicIndex: number
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => ResourceWithQuestionCount[]
}

export default function SortableTopic({
  topic,
  weekId,
  topicIndex,
  progressData,
  getResourcesForTopic
}: SortableTopicProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${weekId}-${topic.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const assignment = topic.assignment
  const topicResources = getResourcesForTopic(assignment.topicId)
  const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
  const totalStudentQuestions = topicResources.reduce((sum, resource) => {
    const resourceCounts = assignmentQuestionCounts[resource.id] || {}
    const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
    return sum + studentCount
  }, 0)

  const completedQuestions = topicResources.reduce((sum, resource) => {
    const progressRecord = progressData.find(progress =>
      progress.resourceId === resource.id &&
      progress.assignmentId === assignment.id
    )
    return sum + (progressRecord?.solvedCount || 0)
  }, 0)

  const progressPercentage = totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0

  const lessonColor = getLessonColor(assignment.topic.lesson)
  const colorClasses = getColorClasses(lessonColor)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${colorClasses} rounded-md p-2 border cursor-move hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium">
          {assignment.topic.order}. {assignment.topic.name}
        </div>
        <div className="text-xs opacity-50">⋮⋮</div>
      </div>
      <div className="text-xs opacity-75 mb-1">
        {assignment.topic.lesson.name}
      </div>
      <div className="text-xs opacity-90 mb-1">
        {completedQuestions}/{totalStudentQuestions} soru ({progressPercentage}%)
      </div>
      <div className={`w-full bg-${lessonColor}-200 rounded-full h-1 mb-1`}>
        <div
          className={`bg-${lessonColor}-500 h-1 rounded-full transition-all duration-500`}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      {topic.isCompleted && (
        <div className="text-xs opacity-90 flex items-center">
          <span className="mr-1">✅</span>
          Tamamlandı
        </div>
      )}
    </div>
  )
}
