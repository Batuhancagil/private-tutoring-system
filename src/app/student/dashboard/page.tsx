'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  email: string
}

interface WeeklySchedule {
  id: string
  title: string
  startDate: string
  endDate: string
  weekPlans: WeekPlan[]
}

interface WeekPlan {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  weekTopics: WeekTopic[]
}

interface WeekTopic {
  id: string
  topicOrder: number
  isCompleted: boolean
  assignment: {
    topic: {
      name: string
      order: number
      lesson: {
        name: string
        color: string
      }
    }
  }
}

interface ProgressData {
  assignmentId: string
  topicId: string
  topicName: string
  lessonName: string
  lessonColor: string
  solvedCount: number
  totalCount: number
}

export default function StudentDashboardPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [progress, setProgress] = useState<ProgressData[]>([])
  const [currentWeek, setCurrentWeek] = useState<WeekPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'progress'>('overview')
  const router = useRouter()

  useEffect(() => {
    // Token kontrolü
    const token = localStorage.getItem('studentToken')
    const studentData = localStorage.getItem('studentData')
    
    if (!token || !studentData) {
      router.push('/student/login')
      return
    }

    try {
      const parsedStudent = JSON.parse(studentData)
      setStudent(parsedStudent)
      fetchStudentData(parsedStudent.id)
    } catch (error) {
      router.push('/student/login')
    }
  }, [router])

  const fetchStudentData = async (studentId: string) => {
    try {
      // Fetch schedule
      const scheduleResponse = await fetch(`/api/weekly-schedules?studentId=${studentId}&page=1&limit=10&includeDetails=true`)
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        if (scheduleData.schedules && scheduleData.schedules.length > 0) {
          setSchedule(scheduleData.schedules[0])
          
          // Find current week
          const today = new Date()
          const foundWeek = scheduleData.schedules[0].weekPlans.find((week: WeekPlan) => {
            const start = new Date(week.startDate)
            const end = new Date(week.endDate)
            return today >= start && today <= end
          })
          setCurrentWeek(foundWeek || scheduleData.schedules[0].weekPlans[0])
        }
      }

      // Fetch progress
      const progressResponse = await fetch(`/api/student-progress?studentId=${studentId}`)
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setProgress(progressData)
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('studentToken')
    localStorage.removeItem('studentData')
    router.push('/student/login')
  }

  const getLessonColor = (color: string) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    }
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.gray
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return null
  }

  const totalTopics = progress.length
  const totalSolved = progress.reduce((sum, p) => sum + p.solvedCount, 0)
  const totalTarget = progress.reduce((sum, p) => sum + p.totalCount, 0)
  const overallProgress = totalTarget > 0 ? Math.round((totalSolved / totalTarget) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Öğrenci Paneli</h1>
              <p className="text-gray-600">Hoş geldin, {student.name}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: '📊 Genel Bakış', icon: '📊' },
              { id: 'schedule', label: '📅 Haftalık Program', icon: '📅' },
              { id: 'progress', label: '📈 İlerleme', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="text-blue-600 text-sm font-medium">Toplam Konu</div>
                  <div className="text-3xl font-bold text-blue-900 mt-2">{totalTopics}</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="text-green-600 text-sm font-medium">Çözülen Soru</div>
                  <div className="text-3xl font-bold text-green-900 mt-2">{totalSolved}</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="text-purple-600 text-sm font-medium">Hedef Soru</div>
                  <div className="text-3xl font-bold text-purple-900 mt-2">{totalTarget}</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="text-orange-600 text-sm font-medium">Genel İlerleme</div>
                  <div className="text-3xl font-bold text-orange-900 mt-2">{overallProgress}%</div>
                </div>
              </div>

              {/* Current Week */}
              {currentWeek && (
                <div className="bg-white rounded-xl shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    📅 Bu Hafta ({new Date(currentWeek.startDate).toLocaleDateString('tr-TR')} - {new Date(currentWeek.endDate).toLocaleDateString('tr-TR')})
                  </h2>
                  <div className="space-y-2">
                    {currentWeek.weekTopics.map((weekTopic) => (
                      <div
                        key={weekTopic.id}
                        className={`${getLessonColor(weekTopic.assignment.topic.lesson.color)} rounded-lg p-3 border`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">
                              {weekTopic.assignment.topic.lesson.name} - {weekTopic.assignment.topic.name}
                            </div>
                          </div>
                          {weekTopic.isCompleted && (
                            <span className="text-green-600 text-xl">✓</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && schedule && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📅 {schedule.title}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {new Date(schedule.startDate).toLocaleDateString('tr-TR')} - {new Date(schedule.endDate).toLocaleDateString('tr-TR')}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedule.weekPlans.map((week) => (
                  <div key={week.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-2">
                      Hafta {week.weekNumber}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      {new Date(week.startDate).toLocaleDateString('tr-TR')} - {new Date(week.endDate).toLocaleDateString('tr-TR')}
                    </p>
                    <div className="space-y-2">
                      {week.weekTopics.map((weekTopic) => (
                        <div
                          key={weekTopic.id}
                          className={`${getLessonColor(weekTopic.assignment.topic.lesson.color)} text-xs rounded p-2 border`}
                        >
                          {weekTopic.assignment.topic.lesson.name} - {weekTopic.assignment.topic.name}
                          {weekTopic.isCompleted && <span className="ml-2">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📈 İlerleme Takibi</h2>
              <div className="space-y-3">
                {progress.map((item) => {
                  const percentage = item.totalCount > 0 ? Math.round((item.solvedCount / item.totalCount) * 100) : 0
                  return (
                    <div key={item.assignmentId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getLessonColor(item.lessonColor)}`}>
                            {item.lessonName}
                          </span>
                          <span className="ml-2 text-sm font-medium text-gray-900">{item.topicName}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.solvedCount}/{item.totalCount} ({percentage}%)
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
                {progress.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Henüz atanmış konu yok
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
