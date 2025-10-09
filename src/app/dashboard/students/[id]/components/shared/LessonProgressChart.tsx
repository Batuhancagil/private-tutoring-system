'use client'

import { useState } from 'react'
import { AssignmentWithDetails, ProgressData, Resource } from '../../types'

interface LessonProgressChartProps {
  assignments: AssignmentWithDetails[]
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => Resource[]
}

export default function LessonProgressChart({
  assignments,
  progressData,
  getResourcesForTopic
}: LessonProgressChartProps) {
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())

  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId)
      } else {
        newSet.add(lessonId)
      }
      return newSet
    })
  }

  // Group assignments by lesson
  const lessonGroups = assignments.reduce((groups, assignment) => {
    if (!assignment) return groups
    const lessonId = assignment.lesson.id
    if (!groups[lessonId]) {
      groups[lessonId] = {
        lesson: assignment.lesson,
        assignments: []
      }
    }
    groups[lessonId].assignments.push(assignment)
    return groups
  }, {} as Record<string, { lesson: any, assignments: AssignmentWithDetails[] }>)

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Ders Bazlı İlerleme Grafiği</h3>
      <div className="space-y-4">
        {Object.values(lessonGroups).map((group) => {
          // Calculate lesson totals
          const lessonTotalTarget = group.assignments.reduce((total, assignment) => {
            const topicResources = getResourcesForTopic(assignment.topicId)
            const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
            return total + topicResources.reduce((sum, resource) => {
              const resourceCounts = assignmentQuestionCounts[resource.id] || {}
              const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
              return sum + studentCount
            }, 0)
          }, 0)

          const lessonTotalCompleted = group.assignments.reduce((total, assignment) => {
            const topicResources = getResourcesForTopic(assignment.topicId)
            return total + topicResources.reduce((sum, resource) => {
              const progressRecord = progressData.find(progress => 
                progress.resourceId === resource.id && 
                progress.assignmentId === assignment.id
              )
              return sum + (progressRecord?.solvedCount || 0)
            }, 0)
          }, 0)

          const lessonProgressPercentage = lessonTotalTarget > 0 ? Math.round((lessonTotalCompleted / lessonTotalTarget) * 100) : 0

          return (
            <div key={group.lesson.id} className="border border-gray-200 rounded-lg">
              {/* Lesson Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <button
                      onClick={() => toggleLessonExpansion(group.lesson.id)}
                      className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedLessons.has(group.lesson.id) ? '▼' : '▶'}
                    </button>
                    <div className="flex items-center mr-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                        {group.lesson.group}
                      </span>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {group.lesson.name}
                      </h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Konular</div>
                      <div className="font-bold text-gray-900">{group.assignments.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-blue-600">Hedef</div>
                      <div className="font-bold text-blue-700">{lessonTotalTarget}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-green-600">Çözülen</div>
                      <div className="font-bold text-green-700">{lessonTotalCompleted}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">İlerleme</div>
                      <div className="font-bold text-gray-900">{lessonProgressPercentage}%</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${lessonProgressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Expanded Topics */}
              {expandedLessons.has(group.lesson.id) && (
                <div className="p-4 bg-gray-50">
                  <div className="space-y-3">
                    {group.assignments.map((assignment) => {
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
                      
                      return (
                        <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3">
                                {assignment.topic.order}
                              </span>
                              <h5 className="text-sm font-medium text-gray-900">
                                {assignment.topic.name}
                              </h5>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-blue-600 font-medium">{completedQuestions}/{totalStudentQuestions}</span>
                              <span className="text-gray-500">{progressPercentage}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
