'use client'

import { useState, useEffect } from 'react'
import { get } from '@/lib/api-client'
import { AssignmentWithDetails, ProgressData, ResourceWithQuestionCount } from '../types'

interface DailyCalendarProps {
  studentId: string
  assignmentsWithDetails: AssignmentWithDetails[]
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => ResourceWithQuestionCount[]
}

interface DailyScheduleTopic {
  id: string
  assignmentId: string
  topic: {
    id: string
    name: string
    order: number
    lesson: {
      id: string
      name: string
      group: string
    }
  }
  isCompleted: boolean
}

interface DailySchedule {
  date: string
  weekNumber: number
  topics: DailyScheduleTopic[]
}

export default function DailyCalendar({
  studentId,
  assignmentsWithDetails,
  progressData,
  getResourcesForTopic
}: DailyCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dailySchedule, setDailySchedule] = useState<DailySchedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch daily schedule
  const fetchDailySchedule = async (date: string) => {
    try {
      setLoading(true)
      setError(null)

      // Get weekly schedules to find which week contains this date
      const schedulesData = await get<any>(`/api/weekly-schedules?studentId=${studentId}&page=1&limit=10&includeDetails=true`)
      
      const schedules = schedulesData?.schedules || schedulesData?.data?.schedules || (Array.isArray(schedulesData) ? schedulesData : [])
      
      if (schedules.length === 0) {
        setDailySchedule(null)
        return
      }

      const activeSchedule = schedules[0]
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)

      // Find the week that contains this date
      let foundWeek: any = null
      for (const week of activeSchedule.weekPlans || []) {
        const weekStart = new Date(week.startDate)
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(week.endDate)
        weekEnd.setHours(23, 59, 59, 999)

        if (targetDate >= weekStart && targetDate <= weekEnd) {
          foundWeek = week
          break
        }
      }

      if (!foundWeek) {
        setDailySchedule(null)
        return
      }

      // Map week topics to daily schedule format
      const topics: DailyScheduleTopic[] = (foundWeek.weekTopics || []).map((weekTopic: any) => ({
        id: weekTopic.id,
        assignmentId: weekTopic.assignmentId,
        topic: {
          id: weekTopic.assignment.topic.id,
          name: weekTopic.assignment.topic.name,
          order: weekTopic.assignment.topic.order,
          lesson: {
            id: weekTopic.assignment.topic.lesson.id,
            name: weekTopic.assignment.topic.lesson.name,
            group: weekTopic.assignment.topic.lesson.group || 'Genel'
          }
        },
        isCompleted: weekTopic.isCompleted || false
      }))

      setDailySchedule({
        date,
        weekNumber: foundWeek.weekNumber,
        topics
      })
    } catch (err: any) {
      setError(err?.message || 'Günlük program yüklenirken hata oluştu')
      console.error('Failed to fetch daily schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId && selectedDate) {
      fetchDailySchedule(selectedDate)
    }
  }, [studentId, selectedDate])

  const goToPreviousDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  // Group topics by lesson
  const topicsByLesson = dailySchedule?.topics.reduce((acc, topic) => {
    const lessonId = topic.topic.lesson.id
    if (!acc[lessonId]) {
      acc[lessonId] = {
        lesson: topic.topic.lesson,
        topics: []
      }
    }
    acc[lessonId].topics.push(topic)
    return acc
  }, {} as Record<string, { lesson: { id: string; name: string; group: string }, topics: DailyScheduleTopic[] }>) || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Günlük Takvim</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousDay}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              ← Önceki Gün
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
            >
              📅 Bugün
            </button>
            <button
              onClick={goToNextDay}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Sonraki Gün →
            </button>
          </div>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tarih Seç
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
        </div>

        {/* Selected Date Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-1">
            {formatDate(selectedDate)}
          </h3>
          {dailySchedule && (
            <p className="text-sm text-blue-700">
              Hafta {dailySchedule.weekNumber}
            </p>
          )}
        </div>
      </div>

      {/* Daily Schedule Content */}
      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-8">
            <div className="text-red-600 text-4xl mb-4">⚠️</div>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      ) : !dailySchedule || dailySchedule.topics.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <p className="text-gray-500 text-lg mb-2">Bu tarih için programlanmış konu bulunmuyor</p>
            <p className="text-gray-400 text-sm">
              Seçilen tarih için haftalık programda konu atanmamış.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grouped by Lesson */}
          {Object.entries(topicsByLesson).map(([lessonId, lessonData]) => {
            const completedTopics = lessonData.topics.filter(t => t.isCompleted).length
            const totalTopics = lessonData.topics.length

            return (
              <div key={lessonId} className="bg-white border-2 border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Lesson Header */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                        {lessonData.lesson.group}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">
                        {lessonData.lesson.name}
                      </h3>
                    </div>
                    <div className="text-sm text-gray-600">
                      {completedTopics}/{totalTopics} tamamlandı
                    </div>
                  </div>
                </div>

                {/* Topics List */}
                <div className="p-4 space-y-2">
                  {lessonData.topics.map((topic) => {
                    const assignment = assignmentsWithDetails.find(a => a.id === topic.assignmentId)
                    const topicResources = assignment ? getResourcesForTopic(assignment.topicId) : []
                    const assignmentQuestionCounts = assignment?.questionCounts as Record<string, Record<string, number>> || {}
                    
                    const totalStudentQuestions = topicResources.reduce((sum, resource) => {
                      const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                      const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + (typeof count === 'number' ? count : 0), 0)
                      return sum + studentCount
                    }, 0)

                    const completedQuestions = topicResources.reduce((sum, resource) => {
                      const progressRecord = progressData.find(progress =>
                        progress.resourceId === resource.id &&
                        progress.assignmentId === topic.assignmentId
                      )
                      return sum + (progressRecord?.solvedCount || 0)
                    }, 0)

                    const progress = totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0

                    return (
                      <div
                        key={topic.id}
                        className={`border rounded-lg p-3 ${
                          topic.isCompleted
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`text-lg ${topic.isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                              {topic.isCompleted ? '✅' : '⏳'}
                            </span>
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">
                                {topic.topic.order}. {topic.topic.name}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                <span>Hedef: {totalStudentQuestions}</span>
                                <span>Çözülen: {completedQuestions}</span>
                                <span>İlerleme: {progress}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="w-24">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

