'use client'

import { useState } from 'react'
import TopicCard from './shared/TopicCard'
import { AssignmentWithDetails, ProgressData, Resource } from '../types'

interface TopicTrackingProps {
  assignments: AssignmentWithDetails[]
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => Resource[]
  incrementProgress: (assignmentId: string, resourceId: string, topicId: string) => Promise<void>
  showAssignmentModule: boolean
  onToggleAssignmentModule: () => void
}

export default function TopicTracking({
  assignments,
  progressData,
  getResourcesForTopic,
  incrementProgress,
  showAssignmentModule,
  onToggleAssignmentModule
}: TopicTrackingProps) {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Konu Takip</h2>
            <p className="text-gray-600 mt-1">Atanan konuların detaylı takibi ve yönetimi</p>
          </div>
          <button
            onClick={onToggleAssignmentModule}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <span className="mr-2">{showAssignmentModule ? '−' : '+'}</span>
            {showAssignmentModule ? 'Modülü Gizle' : 'Yeni Konu Ata'}
          </button>
        </div>
        
        {assignments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
            <p className="text-gray-400 text-sm mb-6">
              Öğrenciye konu atayarak takibe başlayın.
            </p>
            <button
              onClick={onToggleAssignmentModule}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              İlk Konuyu Ata
            </button>
          </div>
        )}
      </div>

      {/* Assigned Topics List */}
      {assignments.length > 0 && (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const topicResources = getResourcesForTopic(assignment.topicId)
            
            // Calculate student assigned questions from questionCounts
            const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
            const totalStudentQuestions = topicResources.reduce((sum, resource) => {
              const resourceCounts = assignmentQuestionCounts[resource.id] || {}
              const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
              return sum + studentCount
            }, 0)
            
            // Calculate completed questions from real progress data
            const completedQuestions = topicResources.reduce((sum, resource) => {
              const progressRecord = progressData.find(progress => 
                progress.resourceId === resource.id && 
                progress.assignmentId === assignment.id
              )
              return sum + (progressRecord?.solvedCount || 0)
            }, 0)
            
            const progressPercentage = totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0
            
            return (
              <TopicCard
                key={assignment.id}
                topic={assignment.topic}
                lesson={assignment.lesson}
                progress={{
                  completed: completedQuestions,
                  total: totalStudentQuestions,
                  percentage: progressPercentage
                }}
                isExpanded={expandedTopics.has(assignment.id)}
                onToggleExpansion={() => toggleTopicExpansion(assignment.id)}
              >
                {/* Resource Details */}
                {topicResources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">📚 Kaynak Detayları</h4>
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
                                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
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
              </TopicCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
