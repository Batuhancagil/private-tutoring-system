'use client'

import { useState, useEffect, useMemo } from 'react'
import { get } from '@/lib/api-client'
import { AssignmentWithDetails, ProgressData, ResourceWithQuestionCount } from '../types'

interface TimelineViewProps {
  studentId: string
  assignmentsWithDetails: AssignmentWithDetails[]
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => ResourceWithQuestionCount[]
}

interface TimelineTopic {
  id: string
  assignmentId: string
  weekNumber: number
  weekStart: Date
  weekEnd: Date
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

interface TimelineLesson {
  lessonId: string
  lessonName: string
  lessonGroup: string
  topics: TimelineTopic[]
}

export default function TimelineView({
  studentId,
  assignmentsWithDetails,
  progressData,
  getResourcesForTopic
}: TimelineViewProps) {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState<'week' | 'month'>('week')
  const [startDate, setStartDate] = useState<Date>(new Date())

  // Fetch schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true)
        setError(null)

        const schedulesData = await get<any>(`/api/weekly-schedules?studentId=${studentId}&page=1&limit=10&includeDetails=true`)
        
        const schedulesArray = schedulesData?.schedules || schedulesData?.data?.schedules || (Array.isArray(schedulesData) ? schedulesData : [])
        setSchedules(schedulesArray)

        if (schedulesArray.length > 0 && schedulesArray[0].startDate) {
          setStartDate(new Date(schedulesArray[0].startDate))
        }
      } catch (err: any) {
        setError(err?.message || 'Timeline yüklenirken hata oluştu')
        console.error('Failed to fetch schedules:', err)
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchSchedules()
    }
  }, [studentId])

  // Build timeline data structure
  const timelineData = useMemo(() => {
    if (schedules.length === 0) return []

    const activeSchedule = schedules[0]
    const lessonsMap = new Map<string, TimelineLesson>()

    // Process all weeks
    for (const week of activeSchedule.weekPlans || []) {
      const weekStart = new Date(week.startDate)
      const weekEnd = new Date(week.endDate)

      for (const weekTopic of week.weekTopics || []) {
        const lessonId = weekTopic.assignment.topic.lesson.id
        const lessonName = weekTopic.assignment.topic.lesson.name
        const lessonGroup = weekTopic.assignment.topic.lesson.group || 'Genel'

        if (!lessonsMap.has(lessonId)) {
          lessonsMap.set(lessonId, {
            lessonId,
            lessonName,
            lessonGroup,
            topics: []
          })
        }

        const lesson = lessonsMap.get(lessonId)!
        lesson.topics.push({
          id: weekTopic.id,
          assignmentId: weekTopic.assignmentId,
          weekNumber: week.weekNumber,
          weekStart,
          weekEnd,
          topic: {
            id: weekTopic.assignment.topic.id,
            name: weekTopic.assignment.topic.name,
            order: weekTopic.assignment.topic.order,
            lesson: {
              id: lessonId,
              name: lessonName,
              group: lessonGroup
            }
          },
          isCompleted: weekTopic.isCompleted || false
        })
      }
    }

    return Array.from(lessonsMap.values())
  }, [schedules])

  // Calculate timeline bounds
  const timelineBounds = useMemo(() => {
    if (schedules.length === 0) return { start: new Date(), end: new Date() }

    const activeSchedule = schedules[0]
    return {
      start: new Date(activeSchedule.startDate),
      end: new Date(activeSchedule.endDate)
    }
  }, [schedules])

  // Calculate date range for display
  const dateRange = useMemo(() => {
    const start = new Date(timelineBounds.start)
    const end = new Date(timelineBounds.end)
    
    if (zoomLevel === 'week') {
      // Show 4 weeks at a time
      const weeksToShow = 4
      const daysToShow = weeksToShow * 7
      end.setTime(start.getTime() + daysToShow * 24 * 60 * 60 * 1000)
    } else {
      // Show full range for month view
    }

    return { start, end }
  }, [timelineBounds, zoomLevel])

  // Calculate pixel positions
  const getDatePosition = (date: Date) => {
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    const daysFromStart = (date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    return (daysFromStart / totalDays) * 100
  }

  const getTopicWidth = (topic: TimelineTopic) => {
    const days = (topic.weekEnd.getTime() - topic.weekStart.getTime()) / (1000 * 60 * 60 * 24) + 1
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    return (days / totalDays) * 100
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (timelineData.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <p className="text-gray-500 text-lg mb-2">Timeline görünümü için program oluşturun</p>
          <p className="text-gray-400 text-sm">
            Haftalık program oluşturulduktan sonra timeline görünümü aktif olacaktır.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Timeline Görünümü</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel('week')}
              className={`px-3 py-1 text-sm rounded ${
                zoomLevel === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Haftalık
            </button>
            <button
              onClick={() => setZoomLevel('month')}
              className={`px-3 py-1 text-sm rounded ${
                zoomLevel === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aylık
            </button>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Tarih Aralığı:</span>{' '}
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white shadow rounded-lg p-6 overflow-x-auto">
        <div className="min-w-full">
          {/* Date Header */}
          <div className="mb-4 pb-2 border-b border-gray-200">
            <div className="relative" style={{ minHeight: '30px' }}>
              {timelineData.length > 0 && (() => {
                const weeks: Date[] = []
                let currentDate = new Date(dateRange.start)
                while (currentDate <= dateRange.end) {
                  weeks.push(new Date(currentDate))
                  currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
                }
                return weeks.map((weekStart, index) => {
                  const position = getDatePosition(weekStart)
                  return (
                    <div
                      key={index}
                      className="absolute border-l border-gray-300"
                      style={{ left: `${position}%` }}
                    >
                      <div className="text-xs text-gray-600 px-1">
                        {formatDate(weekStart)}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          {/* Timeline Rows (Lessons as Epics) */}
          <div className="space-y-4">
            {timelineData.map((lesson) => {
              const completedTopics = lesson.topics.filter(t => t.isCompleted).length
              const totalTopics = lesson.topics.length

              return (
                <div key={lesson.lessonId} className="border-b border-gray-200 pb-4 last:border-b-0">
                  {/* Lesson Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                      {lesson.lessonGroup}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{lesson.lessonName}</h3>
                    <span className="text-xs text-gray-500">
                      ({completedTopics}/{totalTopics} tamamlandı)
                    </span>
                  </div>

                  {/* Timeline Bar */}
                  <div className="relative" style={{ minHeight: '40px', marginLeft: '0%' }}>
                    {lesson.topics.map((topic) => {
                      const left = getDatePosition(topic.weekStart)
                      const width = getTopicWidth(topic)
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
                          className="absolute group"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            minWidth: '80px'
                          }}
                        >
                          <div
                            className={`h-8 rounded border-2 cursor-pointer transition-all ${
                              topic.isCompleted
                                ? 'bg-green-100 border-green-400'
                                : 'bg-blue-100 border-blue-400 hover:bg-blue-200'
                            }`}
                            title={`${topic.topic.name} - Hafta ${topic.weekNumber} - İlerleme: ${progress}%`}
                          >
                            <div className="px-2 py-1 h-full flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {topic.topic.order}. {topic.topic.name}
                              </span>
                              <span className="text-xs text-gray-600 ml-2">
                                {progress}%
                              </span>
                            </div>
                            {/* Progress indicator */}
                            <div
                              className={`h-1 rounded-b ${
                                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current Date Indicator */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span>Bugün: {formatDate(new Date())}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

