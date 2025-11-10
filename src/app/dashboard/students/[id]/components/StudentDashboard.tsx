'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProgressCard from './shared/ProgressCard'
import LessonProgressChart from './shared/LessonProgressChart'
import { Student, AssignmentWithDetails, ProgressData, Resource, ResourceWithQuestionCount } from '../types'

interface StudentDashboardProps {
  student: Student
  assignments: AssignmentWithDetails[]
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => ResourceWithQuestionCount[]
  incrementProgress: (assignmentId: string, resourceId: string, topicId: string) => Promise<void>
  showAssignmentModule: boolean
  onToggleAssignmentModule: () => void
}

export default function StudentDashboard({
  student,
  assignments,
  progressData,
  getResourcesForTopic,
  incrementProgress,
  showAssignmentModule,
  onToggleAssignmentModule
}: StudentDashboardProps) {
  const router = useRouter()
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())

  const toggleTopicExpansion = (topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(topicId)) {
        newSet.delete(topicId)
      } else {
        newSet.add(topicId)
      }
      return newSet
    })
  }

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

  // Calculate dashboard metrics
  const safeAssignments = Array.isArray(assignments) ? assignments : []
  const safeProgressData = Array.isArray(progressData) ? progressData : []
  const totalAssignedTopics = safeAssignments.length

  const totalTargetQuestions = safeAssignments.reduce((total, assignment) => {
    if (!assignment) return total
    const topicResources = getResourcesForTopic(assignment.topicId)
    if (!Array.isArray(topicResources)) return total
    const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
    return total + topicResources.reduce((sum, resource) => {
      if (!resource) return sum
      const resourceCounts = assignmentQuestionCounts[resource.id] || {}
      const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + (typeof count === 'number' ? count : 0), 0)
      return sum + studentCount
    }, 0)
  }, 0)

  const totalCompletedQuestions = safeAssignments.reduce((total, assignment) => {
    if (!assignment) return total
    const topicResources = getResourcesForTopic(assignment.topicId)
    if (!Array.isArray(topicResources)) return total
    return total + topicResources.reduce((sum, resource) => {
      if (!resource) return sum
      const progressRecord = safeProgressData.find(progress =>
        progress?.resourceId === resource.id &&
        progress?.assignmentId === assignment.id
      )
      return sum + (progressRecord?.solvedCount || 0)
    }, 0)
  }, 0)

  const overallProgress = totalTargetQuestions > 0 ? Math.round((totalCompletedQuestions / totalTargetQuestions) * 100) : 0

  // Group assignments by lesson (epic)
  const assignmentsByLesson = safeAssignments.reduce((acc, assignment) => {
    if (!assignment) return acc
    const lessonId = assignment.lesson.id
    if (!acc[lessonId]) {
      acc[lessonId] = {
        lesson: assignment.lesson,
        assignments: []
      }
    }
    acc[lessonId].assignments.push(assignment)
    return acc
  }, {} as Record<string, { lesson: AssignmentWithDetails['lesson'], assignments: AssignmentWithDetails[] }>)

  // Calculate lesson-level stats
  const lessonStats = Object.entries(assignmentsByLesson).map(([lessonId, data]) => {
    const lessonAssignments = data.assignments
    const lessonTargetQuestions = lessonAssignments.reduce((total, assignment) => {
      const topicResources = getResourcesForTopic(assignment.topicId)
      if (!Array.isArray(topicResources)) return total
      const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
      return total + topicResources.reduce((sum, resource) => {
        if (!resource) return sum
        const resourceCounts = assignmentQuestionCounts[resource.id] || {}
        const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + (typeof count === 'number' ? count : 0), 0)
        return sum + studentCount
      }, 0)
    }, 0)

    const lessonCompletedQuestions = lessonAssignments.reduce((total, assignment) => {
      const topicResources = getResourcesForTopic(assignment.topicId)
      if (!Array.isArray(topicResources)) return total
      return total + topicResources.reduce((sum, resource) => {
        if (!resource) return sum
        const progressRecord = safeProgressData.find(progress =>
          progress?.resourceId === resource.id &&
          progress?.assignmentId === assignment.id
        )
        return sum + (progressRecord?.solvedCount || 0)
      }, 0)
    }, 0)

    const lessonProgress = lessonTargetQuestions > 0 ? Math.round((lessonCompletedQuestions / lessonTargetQuestions) * 100) : 0
    const completedTopics = lessonAssignments.filter(a => a.completed).length

    return {
      lessonId,
      lesson: data.lesson,
      assignments: lessonAssignments,
      targetQuestions: lessonTargetQuestions,
      completedQuestions: lessonCompletedQuestions,
      progress: lessonProgress,
      completedTopics,
      totalTopics: lessonAssignments.length
    }
  })

  // Sort lessons by group, then by name
  lessonStats.sort((a, b) => {
    if (a.lesson.group !== b.lesson.group) {
      return a.lesson.group.localeCompare(b.lesson.group)
    }
    return a.lesson.name.localeCompare(b.lesson.name)
  })

  return (
    <div className="space-y-6">
      {/* Student Header with Metrics */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-600 mt-2">Öğrenci İlerleme Dashboard</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/students')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center transition-colors"
          >
            <span className="mr-2">←</span>
            Geri
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProgressCard
            title="Toplam Atanan Konu"
            value={totalAssignedTopics}
            icon="📚"
            color="blue"
          />
          <ProgressCard
            title="Toplam Hedef Soru"
            value={totalTargetQuestions}
            icon="🎯"
            color="green"
          />
          <ProgressCard
            title="Çözülen Soru"
            value={totalCompletedQuestions}
            icon="✅"
            color="purple"
          />
          <ProgressCard
            title="Genel İlerleme"
            value={`${overallProgress}%`}
            icon="📈"
            color="orange"
          />
        </div>
      </div>

      {/* Lesson Progress Chart */}
      <LessonProgressChart
        assignments={assignments}
        progressData={progressData}
        getResourcesForTopic={getResourcesForTopic}
      />

      {/* Assigned Topics Dashboard */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Atanmış Konular Dashboard</h2>
          <button
            onClick={() => {
              onToggleAssignmentModule()
              // Scroll to assignment module when opening
              if (!showAssignmentModule) {
                setTimeout(() => {
                  const moduleElement = document.getElementById('topic-assignment-module')
                  if (moduleElement) {
                    moduleElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }, 100)
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <span className="mr-2">{showAssignmentModule ? '−' : '+'}</span>
            {showAssignmentModule ? 'Modülü Gizle' : 'Yeni Konu Ata'}
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
            <button
              onClick={() => {
                onToggleAssignmentModule()
                // Scroll to assignment module
                setTimeout(() => {
                  const moduleElement = document.getElementById('topic-assignment-module')
                  if (moduleElement) {
                    moduleElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }, 100)
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              İlk Konuyu Ata
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grouped by Lesson (Epic) */}
            {lessonStats.map((lessonStat) => {
              const isLessonExpanded = expandedLessons.has(lessonStat.lessonId)
              
              return (
                <div key={lessonStat.lessonId} className="bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                  {/* Lesson Header (Epic) */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <button
                          onClick={() => toggleLessonExpansion(lessonStat.lessonId)}
                          className="mr-3 text-gray-600 hover:text-gray-800 transition-colors text-xl font-bold"
                        >
                          {isLessonExpanded ? '▼' : '▶'}
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                            {lessonStat.lesson.group}
                          </span>
                          <h3 className="text-xl font-bold text-gray-900">
                            {lessonStat.lesson.name}
                          </h3>
                        </div>
                      </div>
                      
                      {/* Lesson Stats */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Konular</div>
                          <div className="font-bold text-gray-900">
                            {lessonStat.completedTopics}/{lessonStat.totalTopics}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-blue-600">Hedef</div>
                          <div className="font-bold text-blue-700">{lessonStat.targetQuestions}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-green-600">Çözülen</div>
                          <div className="font-bold text-green-700">{lessonStat.completedQuestions}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">İlerleme</div>
                          <div className="font-bold text-gray-900">{lessonStat.progress}%</div>
                        </div>
                        <div className="w-16">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${lessonStat.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Topics List (Issues) */}
                  {isLessonExpanded && (
                    <div className="p-4 space-y-3">
                      {lessonStat.assignments.map((assignment) => {
                        if (!assignment) return null
                        const topicResources = getResourcesForTopic(assignment.topicId)
                        if (!Array.isArray(topicResources)) return null

                        // Calculate student assigned questions from questionCounts
                        const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                        const totalStudentQuestions = topicResources.reduce((sum, resource) => {
                          const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                          const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                          return sum + studentCount
                        }, 0)

                        // Calculate completed questions from real progress data
                        const completedQuestions = topicResources.reduce((sum, resource) => {
                          // Find progress record for this resource and assignment
                          const progressRecord = progressData.find(progress =>
                            progress.resourceId === resource.id &&
                            progress.assignmentId === assignment.id
                          )
                          return sum + (progressRecord?.solvedCount || 0)
                        }, 0)

                        const isTopicExpanded = expandedTopics.has(assignment.id)
                        const topicProgress = totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0

                        return (
                          <div key={assignment.id} className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                            {/* Topic Header */}
                            <div className="p-3 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                  <button
                                    onClick={() => toggleTopicExpansion(assignment.id)}
                                    className="mr-3 text-gray-500 hover:text-gray-700 transition-colors"
                                  >
                                    {isTopicExpanded ? '▼' : '▶'}
                                  </button>
                                  <div className="flex-1">
                                    <h4 className="text-base font-semibold text-gray-900">
                                      {assignment.topic.order}. {assignment.topic.name}
                                    </h4>
                                  </div>
                                </div>

                                {/* Topic Stats */}
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">Kaynak</div>
                                    <div className="font-bold text-gray-900">{topicResources.length}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-blue-600">Hedef</div>
                                    <div className="font-bold text-blue-700">{totalStudentQuestions}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-green-600">Çözülen</div>
                                    <div className="font-bold text-green-700">{completedQuestions}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">İlerleme</div>
                                    <div className="font-bold text-gray-900">{topicProgress}%</div>
                                  </div>
                                  <div className="w-12">
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                          topicProgress === 100 ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${topicProgress}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      assignment.completed
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {assignment.completed ? '✅' : '⏳'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isTopicExpanded && (
                              <div className="p-3 bg-white">
                                {/* Resource Details */}
                                {topicResources.length > 0 && (
                                  <div className="pt-3 border-t border-gray-200">
                                    <h5 className="text-sm font-semibold text-gray-800 mb-3">📚 Kaynak Detayları</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {topicResources.map(resource => {
                              const resourceQuestions = resource.questionCount || 0
                              const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                              const studentCount = Object.values(resourceCounts).reduce((sum, count) => sum + count, 0)

                              // Find progress record for this specific resource and assignment
                              const progressRecord = progressData.find(progress =>
                                progress.resourceId === resource.id &&
                                progress.assignmentId === assignment.id
                              )
                              const completedCount = progressRecord?.solvedCount || 0
                              const progressPercentage = studentCount > 0 ? Math.round((completedCount / studentCount) * 100) : 0

                              return (
                                <div key={resource.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all duration-200">
                                  <div className="flex items-center justify-between mb-4">
                                    <h5 className="text-sm font-bold text-gray-800 truncate">
                                      {resource.name}
                                    </h5>
                                    <span className="text-xs text-gray-500">
                                      {resourceQuestions} soru
                                    </span>
                                  </div>

                                  {/* Resource Stats */}
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600">📖 Kaynak:</span>
                                      <span className="text-sm font-bold text-gray-700">
                                        {resourceQuestions} Soru
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600">🎯 Çözülmesi Gereken:</span>
                                      <span className="text-sm font-bold text-blue-600">
                                        {studentCount} Soru
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-600">✅ Çözülen:</span>
                                      <span className="text-sm font-bold text-green-600">
                                        {completedCount} Soru
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-gray-600">İlerleme</span>
                                      <span className="text-xs font-bold text-gray-700">{progressPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercentage}%` }}
                                      ></div>
                                    </div>
                                  </div>

                                  {/* Action Button */}
                                  <div className="mt-4 pt-3 border-t border-gray-200">
                                    <button
                                      onClick={() => incrementProgress(assignment.id, resource.id, assignment.topicId)}
                                      className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                      disabled={completedCount >= studentCount}
                                    >
                                      <span>+</span>
                                      <span>{completedCount >= studentCount ? 'Tamamlandı' : 'Soru Çözdüm'}</span>
                                    </button>
                                  </div>

                                  {/* Summary */}
                                  <div className="mt-2">
                                    <div className="text-xs text-center text-gray-600 font-medium">
                                      {resourceQuestions} kaynak / {studentCount} hedef / {completedCount} çözülen
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
