'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StudentDashboard from './components/StudentDashboard'
import ScheduleManagement from './components/ScheduleManagement'
import TopicTracking from './components/TopicTracking'
import StudentInfo from './components/StudentInfo'
import { Student, Lesson, StudentAssignment, ProgressData, Resource, AssignmentWithDetails } from './types'
import { getResourcesForTopic } from './utils'
import { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  // Core data states
  const [student, setStudent] = useState<Student | null>(null)
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topic-tracking' | 'schedule' | 'student-info'>('dashboard')

  // Schedule states
  const [weeklySchedules, setWeeklySchedules] = useState<any[]>([])
  const [activeSchedule, setActiveSchedule] = useState<any>(null)
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly')

  // Fetch progress data
  const fetchProgressData = async () => {
    try {
      const response = await fetch(`/api/student-progress?studentId=${studentId}`)
      if (response.ok) {
        const progress = await response.json()
        setProgressData(Array.isArray(progress) ? progress : [])
      }
    } catch (error) {
      // Error handled silently in production
    }
  }

  // Increment progress
  const incrementProgress = async (assignmentId: string, resourceId: string, topicId: string) => {
    try {
      const response = await fetch('/api/student-progress/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          assignmentId,
          resourceId,
          topicId,
          increment: 1
        })
      })

      if (response.ok) {
        await fetchProgressData()
      }
    } catch (error) {
      // Error handled silently in production
    }
  }

  // Fetch weekly schedules with specific week page
  const fetchWeeklySchedules = async (weekPageNum: number = 0) => {
    try {
      const response = await fetch(`/api/weekly-schedules?studentId=${studentId}&page=1&limit=10&includeDetails=true&weekPage=${weekPageNum}`)
      if (response.ok) {
        const data = await response.json()

        // New API format with pagination
        if (data.schedules) {
          // For week pagination, update only the active schedule's weeks
          if (data.schedules.length > 0) {
            const newSchedule = data.schedules[0]
            setActiveSchedule(newSchedule)

            // Only update schedules list on initial load (weekPageNum === 0)
            if (weekPageNum === 0) {
              setWeeklySchedules(data.schedules)
            }
          }
        } else {
          // Fallback for old API format
          setWeeklySchedules(data)
          if (data.length > 0) {
            setActiveSchedule(data[0])
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch weekly schedules:', error)
    }
  }

  // Handle drag end for topic rearrangement
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !activeSchedule) return

    const activeWeekId = active.id.toString().split('-')[0]
    const overWeekId = over.id.toString().split('-')[0]

    if (activeWeekId === overWeekId) {
      // Reordering within same week
      const weekIndex = activeSchedule.weekPlans.findIndex((week: any) => week.id === activeWeekId)
      if (weekIndex === -1) return

      const week = activeSchedule.weekPlans[weekIndex]
      const oldIndex = week.weekTopics.findIndex((topic: any) => topic.id === active.id)
      const newIndex = week.weekTopics.findIndex((topic: any) => topic.id === over.id)

      if (oldIndex !== newIndex) {
        const newWeekTopics = arrayMove(week.weekTopics, oldIndex, newIndex)

        // Update local state
        const newSchedule = { ...activeSchedule }
        newSchedule.weekPlans[weekIndex].weekTopics = newWeekTopics
        setActiveSchedule(newSchedule)

        // TODO: Update database with new order
      }
    } else {
      // Moving between weeks
      // TODO: Implement cross-week topic movement
    }
  }

  // Navigate between months - now fetches data from API
  const goToPreviousMonth = async () => {
    const newOffset = Math.max(currentMonthOffset - 1, 0)
    setCurrentMonthOffset(newOffset)
    await fetchWeeklySchedules(newOffset)
  }

  const goToNextMonth = async () => {
    const newOffset = currentMonthOffset + 1
    setCurrentMonthOffset(newOffset)
    await fetchWeeklySchedules(newOffset)
  }

  const goToCurrentMonth = async () => {
    if (!activeSchedule) {
      return
    }

    // Calculate current week based on schedule start date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const scheduleStart = new Date(activeSchedule.startDate)
    scheduleStart.setHours(0, 0, 0, 0)

    const scheduleEnd = new Date(activeSchedule.endDate)
    scheduleEnd.setHours(23, 59, 59, 999)

    // Check if today is within schedule range
    if (today < scheduleStart) {
      setCurrentMonthOffset(0)
      await fetchWeeklySchedules(0)
      return
    }

    if (today > scheduleEnd) {
      setCurrentMonthOffset(0)
      await fetchWeeklySchedules(0)
      return
    }

    // Calculate which week number (assuming 7-day weeks)
    const daysSinceStart = Math.floor((today.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24))
    const currentWeekNumber = Math.floor(daysSinceStart / 7) + 1 // Week 1, 2, 3...

    // Calculate which page (0-indexed)
    const targetPage = Math.floor((currentWeekNumber - 1) / 4)

    setCurrentMonthOffset(targetPage)
    await fetchWeeklySchedules(targetPage)
  }

  // Create weekly schedule
  const createWeeklySchedule = async (data: any) => {
    if (!data.title || !data.startDate || !data.endDate) {
      return { success: false, error: 'Lütfen tüm alanları doldurun' }
    }

    try {
      const response = await fetch('/api/weekly-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          title: data.title,
          startDate: data.startDate,
          endDate: data.endDate,
          assignments: data.assignments // All assignments will be distributed across weeks
        })
      })

      if (response.ok) {
        await fetchWeeklySchedules()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.details || error.error }
      }
    } catch (error) {
      return { success: false, error: 'Program oluşturulurken hata oluştu' }
    }
  }

  // Refresh assignments
  const refreshAssignments = async () => {
    try {
      const res = await fetch(`/api/student-assignments?studentId=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setAssignments(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to refresh assignments:', error)
    }
  }

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)

        // Fetch student info
        const studentRes = await fetch(`/api/students/${studentId}`)
        if (!studentRes.ok) {
          throw new Error('Öğrenci bulunamadı')
        }
        const studentData = await studentRes.json()
        setStudent(studentData)

        // Fetch assignments, lessons, and resources
        const [assignmentsRes, lessonsRes, resourcesRes] = await Promise.all([
          fetch(`/api/student-assignments?studentId=${studentId}`),
          fetch('/api/lessons'),
          fetch('/api/resources')
        ])

        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json()
          setAssignments(Array.isArray(assignmentsData) ? assignmentsData : [])
        }

        if (lessonsRes.ok) {
          const lessonsData = await lessonsRes.json()
          setLessons(Array.isArray(lessonsData) ? lessonsData : [])
        }

        if (resourcesRes.ok) {
          const resourcesData = await resourcesRes.json()
          setResources(Array.isArray(resourcesData) ? resourcesData : [])
        }

        // Fetch progress data
        await fetchProgressData()

        // Fetch weekly schedules
        await fetchWeeklySchedules()

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchStudentData()
    }
  }, [studentId])

  // Create a flat list of assignments with topic and lesson info, sorted by order
  const assignmentsWithDetails: AssignmentWithDetails[] = (Array.isArray(assignments) ? assignments : [])
    .map(assignment => {
      if (!assignment) return null
      const topicsArray = Array.isArray(lessons) 
        ? lessons.flatMap(l => Array.isArray(l?.topics) ? l.topics : [])
        : []
      const topic = topicsArray.find(t => t?.id === assignment.topicId)
      if (!topic) return null

      const lesson = Array.isArray(lessons) ? lessons.find(l => l?.id === topic.lessonId) : null
      if (!lesson) return null

      return {
        ...assignment,
        topic,
        lesson
      }
    })
    .filter(Boolean) as AssignmentWithDetails[]

  // Sort assignments by lesson group, lesson name, then topic order
  assignmentsWithDetails.sort((a, b) => {
    if (a.lesson.group !== b.lesson.group) {
      return a.lesson.group.localeCompare(b.lesson.group)
    }
    if (a.lesson.name !== b.lesson.name) {
      return a.lesson.name.localeCompare(b.lesson.name)
    }
    return a.topic.order - b.topic.order
  })

  // Wrapper function for getResourcesForTopic that uses the resources state
  const getResourcesForTopicWrapper = (topicId: string) => {
    return getResourcesForTopic(topicId, resources)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hata</h1>
          <p className="text-gray-600">{error || 'Öğrenci bulunamadı'}</p>
          <button
            onClick={() => router.push('/dashboard/students')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tab Navigation - Full Width */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-200">
          <div className="p-2">
            <nav className="flex space-x-2 w-full">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                  }`}
              >
                <span className="text-xl mr-3">📊</span>
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('topic-tracking')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${activeTab === 'topic-tracking'
                    ? 'bg-green-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                  }`}
              >
                <span className="text-xl mr-3">📚</span>
                Konu Takip
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${activeTab === 'schedule'
                    ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                  }`}
              >
                <span className="text-xl mr-3">📅</span>
                Ders Programı
              </button>
              <button
                onClick={() => setActiveTab('student-info')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${activeTab === 'student-info'
                    ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                  }`}
              >
                <span className="text-xl mr-3">👤</span>
                Öğrenci Bilgileri
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <StudentDashboard
            student={student}
            assignments={assignmentsWithDetails}
            progressData={progressData}
            getResourcesForTopic={getResourcesForTopicWrapper}
            incrementProgress={incrementProgress}
            showAssignmentModule={false}
            onToggleAssignmentModule={() => {}}
          />
        )}

        {activeTab === 'topic-tracking' && (
          <TopicTracking
            assignments={assignmentsWithDetails}
            progressData={progressData}
            getResourcesForTopic={getResourcesForTopicWrapper}
            incrementProgress={incrementProgress}
            studentId={studentId}
            onAssignmentComplete={refreshAssignments}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleManagement
            studentId={studentId}
            assignments={assignments}
            assignmentsWithDetails={assignmentsWithDetails}
            schedules={weeklySchedules}
            activeSchedule={activeSchedule}
            loading={false}
            progressData={progressData}
            getResourcesForTopic={getResourcesForTopicWrapper}
            onCreateSchedule={createWeeklySchedule}
            onSetActiveSchedule={setActiveSchedule}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            currentMonthOffset={currentMonthOffset}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            onCurrentMonth={goToCurrentMonth}
            onDragEnd={handleDragEnd}
            activeTab={activeTab}
          />
        )}

        {activeTab === 'student-info' && (
          <StudentInfo student={student} />
        )}
      </div>
    </div>
  )
}
