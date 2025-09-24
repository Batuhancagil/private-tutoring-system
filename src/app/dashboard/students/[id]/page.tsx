'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopicAssignmentModule from '@/components/TopicAssignmentModule'

interface Student {
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

interface Lesson {
  id: string
  name: string
  group: string
  type: string
  subject: string | null
  topics: Topic[]
  createdAt: string
}

interface Topic {
  id: string
  name: string
  order: number
  lessonId: string
  createdAt: string
}

interface StudentAssignment {
  id: string
  studentId: string
  topicId: string
  assignedAt: string
  completed: boolean
  questionCounts?: Record<string, Record<string, number>>
}

interface ProgressData {
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

interface Resource {
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
      topics: Array<{
        id: string
        name: string
        order: number
        lessonId: string
        createdAt: string
      }>
    }
    topics: Array<{
      id: string
      resourceId: string
      topicId: string
      resourceLessonId: string
      questionCount: number
      topic: {
        id: string
        name: string
        order: number
        lessonId: string
        createdAt: string
      }
    }>
  }>
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  
  const [student, setStudent] = useState<Student | null>(null)
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignmentModule, setShowAssignmentModule] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topic-tracking' | 'schedule' | 'student-info'>('dashboard')
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedStartWeek, setSelectedStartWeek] = useState<number>(1)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [weeklySchedules, setWeeklySchedules] = useState<any[]>([])
  const [activeSchedule, setActiveSchedule] = useState<any>(null)

  // Toggle topic expansion
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

  // Toggle lesson expansion
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

  // Fetch progress data
  const fetchProgressData = async () => {
    try {
      const response = await fetch(`/api/student-progress?studentId=${studentId}`)
      if (response.ok) {
        const progress = await response.json()
        setProgressData(progress)
        console.log('Progress data loaded:', progress.length, 'records')
      } else {
        console.error('Failed to fetch progress data')
      }
    } catch (error) {
      console.error('Error fetching progress data:', error)
    }
  }

  // Fetch weekly schedules
  const fetchWeeklySchedules = async () => {
    try {
      const response = await fetch(`/api/weekly-schedules?studentId=${studentId}`)
      if (response.ok) {
        const data = await response.json()
        setWeeklySchedules(data)
        // Set the first active schedule as default
        if (data.length > 0) {
          setActiveSchedule(data[0])
        }
      }
    } catch (error) {
      console.error('Error fetching weekly schedules:', error)
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
        console.log('Progress incremented successfully')
        // Refresh progress data
        await fetchProgressData()
      } else {
        console.error('Failed to increment progress')
      }
    } catch (error) {
      console.error('Error incrementing progress:', error)
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
          setAssignments(assignmentsData)
        }
        
        if (lessonsRes.ok) {
          const lessonsData = await lessonsRes.json()
          setLessons(lessonsData)
        }
        
        if (resourcesRes.ok) {
          const resourcesData = await resourcesRes.json()
          setResources(resourcesData)
        }

        // Fetch progress data
        await fetchProgressData()
        
        // Fetch weekly schedules
        await fetchWeeklySchedules()

      } catch (err) {
        console.error('Error fetching student data:', err)
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
  const assignmentsWithDetails = assignments
    .map(assignment => {
      const topic = lessons.flatMap(l => l.topics).find(t => t.id === assignment.topicId)
      if (!topic) return null
      
      const lesson = lessons.find(l => l.id === topic.lessonId)
      if (!lesson) return null
      
      return {
        ...assignment,
        topic,
        lesson
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by lesson group first, then by lesson name, then by topic order
      if (a!.lesson.group !== b!.lesson.group) {
        return a!.lesson.group.localeCompare(b!.lesson.group)
      }
      if (a!.lesson.name !== b!.lesson.name) {
        return a!.lesson.name.localeCompare(b!.lesson.name)
      }
      return a!.topic.order - b!.topic.order
    })

  // Get resources for a specific topic
  const getResourcesForTopic = (topicId: string) => {
    console.log('getResourcesForTopic called with topicId:', topicId)
    console.log('Available resources:', resources.length)
    
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
      console.log('Processing resource:', resource.name, 'lessons:', resource.lessons?.length)
      
      // Check if resource has lessons and it's an array
      if (!resource.lessons || !Array.isArray(resource.lessons)) {
        console.log('Resource has no lessons or not array:', resource.lessons)
        return
      }
      
      resource.lessons.forEach(resourceLesson => {
        console.log('Checking resource lesson:', resourceLesson.lesson?.name, 'topics:', resourceLesson.topics?.length)
        
        if (!resourceLesson.lesson || !resourceLesson.topics || !Array.isArray(resourceLesson.topics)) {
          console.log('Resource lesson or topics not found:', resourceLesson)
          return
        }
        
        resourceLesson.topics.forEach(resourceTopic => {
          if (resourceTopic.topic.id === topicId) {
            console.log('Found matching topic in resource:', resource.name, 'questionCount:', resourceTopic.questionCount)
            
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
    
    console.log('Found resources for topic:', result.length, result.map(r => ({ name: r.name, questionCount: r.questionCount })))
    return result
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
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">📊</span>
                Dashboard
            </button>
              <button
                onClick={() => setActiveTab('topic-tracking')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'topic-tracking'
                    ? 'bg-green-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">📚</span>
                Konu Takip
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">📅</span>
                Ders Programı
              </button>
              <button
                onClick={() => setActiveTab('student-info')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'student-info'
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
          <div className="space-y-6">
            {/* Dashboard Overview */}
          <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Genel İlerleme Özeti</h2>
                <p className="text-gray-600 mt-1">Öğrencinin genel performans durumu</p>
                </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Toplam Atanan Konu */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Toplam Atanan Konu</p>
                      <p className="text-2xl font-bold text-blue-800 mt-1">{assignments.length}</p>
              </div>
                    <div className="text-blue-400 text-3xl">📚</div>
              </div>
          </div>

                {/* Toplam Hedef Soru */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Toplam Hedef Soru</p>
                      <p className="text-2xl font-bold text-green-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                          const topicResources = getResourcesForTopic(assignment.topicId)
                          const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                          return total + topicResources.reduce((sum, resource) => {
                            const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                            const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                            return sum + studentCount
                          }, 0)
                        }, 0)}
                      </p>
                </div>
                    <div className="text-green-400 text-3xl">🎯</div>
            </div>
          </div>

                {/* Çözülen Soru */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Çözülen Soru</p>
                      <p className="text-2xl font-bold text-purple-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                          const topicResources = getResourcesForTopic(assignment.topicId)
                          return total + topicResources.reduce((sum, resource) => {
                            const progressRecord = progressData.find(progress => 
                              progress.resourceId === resource.id && 
                              progress.assignmentId === assignment.id
                            )
                            return sum + (progressRecord?.solvedCount || 0)
                          }, 0)
                        }, 0)}
                      </p>
                </div>
                    <div className="text-purple-400 text-3xl">✅</div>
              </div>
              </div>

                {/* Genel İlerleme */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Genel İlerleme</p>
                      <p className="text-2xl font-bold text-orange-800 mt-1">
                        {(() => {
                          const totalTarget = assignments.reduce((total, assignment) => {
                    const topicResources = getResourcesForTopic(assignment.topicId)
                            const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                    return total + topicResources.reduce((sum, resource) => {
                              const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                              const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                              return sum + studentCount
                            }, 0)
                          }, 0)
                          
                          const totalCompleted = assignments.reduce((total, assignment) => {
                            const topicResources = getResourcesForTopic(assignment.topicId)
                            return total + topicResources.reduce((sum, resource) => {
                              const progressRecord = progressData.find(progress => 
                                progress.resourceId === resource.id && 
                                progress.assignmentId === assignment.id
                              )
                              return sum + (progressRecord?.solvedCount || 0)
                            }, 0)
                          }, 0)
                          
                          return totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0
                        })()}%
                      </p>
                    </div>
                    <div className="text-orange-400 text-3xl">📈</div>
              </div>
            </div>
            </div>
          </div>

          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Student Header */}
          <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                  <p className="text-gray-600 mt-1">Ders Bazlı İlerleme Grafiği</p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/students')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                >
                  <span className="mr-2">←</span>
                  Geri
                </button>
              </div>
              
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Toplam Atanan Konu */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Toplam Atanan Konu</p>
                      <p className="text-2xl font-bold text-blue-800 mt-1">{assignments.length}</p>
              </div>
                    <div className="text-blue-400 text-3xl">📚</div>
            </div>
          </div>

                {/* Toplam Hedef Soru */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Toplam Hedef Soru</p>
                      <p className="text-2xl font-bold text-green-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                          const topicResources = getResourcesForTopic(assignment.topicId)
                          const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                          return total + topicResources.reduce((sum, resource) => {
                            const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                            const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                            return sum + studentCount
                          }, 0)
                        }, 0)}
                      </p>
                </div>
                    <div className="text-green-400 text-3xl">🎯</div>
              </div>
                </div>

                {/* Çözülen Soru */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Çözülen Soru</p>
                      <p className="text-2xl font-bold text-purple-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                    const topicResources = getResourcesForTopic(assignment.topicId)
                    return total + topicResources.reduce((sum, resource) => {
                            const progressRecord = progressData.find(progress => 
                              progress.resourceId === resource.id && 
                              progress.assignmentId === assignment.id
                            )
                            return sum + (progressRecord?.solvedCount || 0)
                    }, 0)
                  }, 0)}
                </p>
              </div>
                    <div className="text-purple-400 text-3xl">✅</div>
                  </div>
                </div>

                {/* Genel İlerleme */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Genel İlerleme</p>
                      <p className="text-2xl font-bold text-orange-800 mt-1">
                        {(() => {
                          const totalTarget = assignments.reduce((total, assignment) => {
                            const topicResources = getResourcesForTopic(assignment.topicId)
                            const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                            return total + topicResources.reduce((sum, resource) => {
                              const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                              const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                              return sum + studentCount
                            }, 0)
                          }, 0)
                          
                          const totalCompleted = assignments.reduce((total, assignment) => {
                            const topicResources = getResourcesForTopic(assignment.topicId)
                            return total + topicResources.reduce((sum, resource) => {
                              const progressRecord = progressData.find(progress => 
                                progress.resourceId === resource.id && 
                                progress.assignmentId === assignment.id
                              )
                              return sum + (progressRecord?.solvedCount || 0)
                            }, 0)
                          }, 0)
                          
                          return totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0
                        })()}%
                      </p>
                    </div>
                    <div className="text-orange-400 text-3xl">📈</div>
                  </div>
            </div>
          </div>
        </div>


            {/* Progress Chart by Lessons */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ders Bazlı İlerleme Grafiği</h3>
              <div className="space-y-4">
                {(() => {
                  // Group assignments by lesson
                  const lessonGroups = assignmentsWithDetails.reduce((groups, assignment) => {
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
                  }, {} as Record<string, { lesson: any, assignments: any[] }>)

                  return Object.values(lessonGroups).map((group) => {
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
                  })
                })()}
          </div>
        </div>

        {/* Assigned Topics Dashboard */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Atanmış Konular Dashboard</h2>
            <button
              onClick={() => {
                setShowAssignmentModule(!showAssignmentModule)
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
                  setShowAssignmentModule(true)
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
                     {assignmentsWithDetails.map((assignment) => {
                       if (!assignment) return null
                       const topicResources = getResourcesForTopic(assignment.topicId)
                       
                       // Calculate total questions from resources
                       const totalResourceQuestions = topicResources.reduce((sum, resource) => {
                         return sum + (resource.questionCount || 0)
                       }, 0)
                       
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
                       
                       return (
                         <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                           {/* Compact Header */}
                           <div className="p-4 border-b border-gray-100">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center flex-1">
                                 <button
                                   onClick={() => toggleTopicExpansion(assignment.id)}
                                   className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
                                 >
                                   {expandedTopics.has(assignment.id) ? '▼' : '▶'}
                                 </button>
                                 <div className="flex items-center mr-4">
                                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                   {assignment.lesson.group}
                                 </span>
                                   <span className="text-xs text-gray-500">
                                     {assignment.lesson.name}
                                 </span>
                               </div>
                                 <div className="flex-1">
                                   <h3 className="text-lg font-bold text-gray-900">
                                 {assignment.topic.order}. {assignment.topic.name}
                               </h3>
                                 </div>
                               </div>
                               
                               {/* Compact Stats */}
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
                                   <div className="font-bold text-gray-900">
                                     {totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0}%
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
                           {expandedTopics.has(assignment.id) && (
                             <div className="p-4 bg-gray-50">
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
          </>
        )}

        {activeTab === 'topic-tracking' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Konu Takip</h2>
                  <p className="text-gray-600 mt-1">Atanan konuların detaylı takibi ve yönetimi</p>
                </div>
                <button
                  onClick={() => setShowAssignmentModule(!showAssignmentModule)}
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
                    onClick={() => setShowAssignmentModule(true)}
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
                {assignmentsWithDetails.map((assignment) => {
                  if (!assignment) return null
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
                  
                  return (
                    <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Compact Header */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <button
                              onClick={() => toggleTopicExpansion(assignment.id)}
                              className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {expandedTopics.has(assignment.id) ? '▼' : '▶'}
                            </button>
                            <div className="flex items-center mr-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                {assignment.lesson.group}
                              </span>
                              <span className="text-xs text-gray-500">
                                {assignment.lesson.name}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900">
                                {assignment.topic.order}. {assignment.topic.name}
                              </h3>
                            </div>
                          </div>
                          
                          {/* Compact Stats */}
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
                              <div className="font-bold text-gray-900">
                                {totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0}%
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
                      {expandedTopics.has(assignment.id) && (
                        <div className="p-4 bg-gray-50">
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
                             </div>
                           )}
                         </div>
                       )
                     })}
                   </div>
                 )}
        </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Haftalık Ders Programı</h2>
                <div className="flex gap-2">
                  {assignments.length > 0 && (
                    <button 
                      onClick={() => setShowScheduleModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      📅 Program Oluştur
                    </button>
                  )}
                  {weeklySchedules.length > 0 && (
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                      📋 Programı Düzenle
                    </button>
                  )}
                </div>
              </div>
              
              {assignments.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📚</div>
                  <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
                  <p className="text-gray-400 text-sm mb-6">
                    Önce öğrenciye konu atayın, sonra ders programı oluşturun.
                  </p>
                  <button
                    onClick={() => setActiveTab('topic-tracking')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Konu Takip Tabına Git
                  </button>
                </div>
              )}
              
              {assignments.length > 0 && weeklySchedules.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📅</div>
                  <p className="text-gray-500 text-lg mb-4">Henüz program oluşturulmamış</p>
                  <p className="text-gray-400 text-sm mb-6">
                    Öğrenciye atanmış konular var. Haftalık ders programı oluşturabilirsiniz.
                  </p>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Program Oluştur
                  </button>
                </div>
              )}
            </div>

            {/* Weekly Calendar Schedule */}
            {activeSchedule && (
              <div className="space-y-6">
                {(() => {
                  // Get current week from activeSchedule
                  const now = new Date()
                  const currentWeekPlan = activeSchedule.weekPlans.find((week: any) => {
                    const weekStart = new Date(week.startDate)
                    const weekEnd = new Date(week.endDate)
                    return now >= weekStart && now <= weekEnd
                  }) || activeSchedule.weekPlans[0]
                  
                  if (!currentWeekPlan) return null
                  
                  const startOfWeek = new Date(currentWeekPlan.startDate)
                  const endOfWeek = new Date(currentWeekPlan.endDate)
                  
                  // Generate week days
                  const weekDays = []
                  for (let i = 0; i < 7; i++) {
                    const day = new Date(startOfWeek)
                    day.setDate(startOfWeek.getDate() + i)
                    weekDays.push(day)
                  }
                  
                  // Get topics for current week
                  const weekTopics = currentWeekPlan.weekTopics || []
                  
                  return (
                    <div className="bg-white shadow rounded-lg">
                      {/* Week Header */}
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {activeSchedule.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {startOfWeek.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {endOfWeek.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const currentWeekIndex = activeSchedule.weekPlans.findIndex((week: any) => week.id === currentWeekPlan.id)
                                if (currentWeekIndex > 0) {
                                  setCurrentWeek(new Date(activeSchedule.weekPlans[currentWeekIndex - 1].startDate))
                                }
                              }}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              ← Önceki Hafta
                            </button>
                            <button 
                              onClick={() => {
                                const currentWeekIndex = activeSchedule.weekPlans.findIndex((week: any) => week.id === currentWeekPlan.id)
                                if (currentWeekIndex < activeSchedule.weekPlans.length - 1) {
                                  setCurrentWeek(new Date(activeSchedule.weekPlans[currentWeekIndex + 1].startDate))
                                }
                              }}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              Sonraki Hafta →
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Weekly Schedule Grid */}
                      <div className="p-4">
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-2 mb-4">
                          {weekDays.map((day, index) => (
                            <div key={index} className="text-center">
                              <div className="text-xs font-medium text-gray-500 mb-1">
                                {day.toLocaleDateString('tr-TR', { weekday: 'short' })}
                              </div>
                              <div className={`text-lg font-semibold ${
                                day.toDateString() === now.toDateString() 
                                  ? 'text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto' 
                                  : 'text-gray-900'
                              }`}>
                                {day.getDate()}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Weekly Topics Schedule */}
                        <div className="space-y-3">
                          {weekTopics.map((weekTopic: any) => {
                            const assignment = weekTopic.assignment
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
                              <div key={weekTopic.id} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-3">
                                      {assignment.topic.lesson.group}
                                    </span>
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      {assignment.topic.lesson.name}
                                    </h4>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    Hafta {currentWeekPlan.weekNumber}
                                  </span>
                                </div>
                                
                                {/* Topic Details */}
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-800">
                                      {assignment.topic.order}. {assignment.topic.name}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                      weekTopic.isCompleted 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {weekTopic.isCompleted ? '✅ Tamamlandı' : '⏳ Devam Ediyor'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 mb-2">
                                    {completedQuestions}/{totalStudentQuestions} soru ({progressPercentage}%)
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          
                          {weekTopics.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <div className="text-4xl mb-2">📅</div>
                              <p>Bu hafta için konu atanmamış</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Legend */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-center gap-6 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></div>
                              <span>Bugün</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-100 rounded"></div>
                              <span>Tamamlandı</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                              <span>Beklemede</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Schedule Creation Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                📅 Ders Programı Oluştur
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program Başlığı
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 2024 Bahar Dönemi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Program Detayları:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• {assignments.length} atanmış konu bulundu</li>
                    <li>• Her hafta 1 konu işlenecek</li>
                    <li>• Konular atandıkları sıra ile haftalara yerleştirilecek</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  İptal
                </button>
                <button
                  onClick={async () => {
                    // TODO: Create schedule API call
                    setShowScheduleModal(false)
                    // Refresh schedules
                    await fetchWeeklySchedules()
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Program Oluştur
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'student-info' && (
          <div className="space-y-6">
            {/* Student Information Header */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                <p className="text-gray-600 mt-1">Öğrenci Detay Bilgileri</p>
              </div>
            </div>

            {/* Detailed Student Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Kişisel Bilgiler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Ad Soyad</label>
                  <p className="text-gray-900">{student.name}</p>
                </div>
                {student.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">E-posta</label>
                    <p className="text-gray-900">{student.email}</p>
                  </div>
                )}
                {student.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefon</label>
                    <p className="text-gray-900">{student.phone}</p>
                  </div>
                )}
                {student.parentName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Veli Adı</label>
                    <p className="text-gray-900">{student.parentName}</p>
                  </div>
                )}
                {student.parentPhone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Veli Telefonu</label>
                    <p className="text-gray-900">{student.parentPhone}</p>
                  </div>
                )}
                {student.notes && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="text-sm font-medium text-gray-500">Notlar</label>
                    <p className="text-gray-900">{student.notes}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Kayıt Tarihi</label>
                  <p className="text-gray-900">{new Date(student.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topic Assignment Module */}
        {showAssignmentModule && (
          <div id="topic-assignment-module" className="mt-6">
            <TopicAssignmentModule
              studentId={studentId}
              onAssignmentComplete={() => {
                // Refresh assignments after successful assignment
                const fetchAssignments = async () => {
                  try {
                    const res = await fetch(`/api/student-assignments?studentId=${studentId}`)
                    if (res.ok) {
                      const data = await res.json()
                      setAssignments(data)
                    }
                  } catch (error) {
                    console.error('Failed to fetch assignments:', error)
                  }
                }
                fetchAssignments()
                setShowAssignmentModule(false)
              }}
              showTitle={true}
            />
          </div>
        )}
      </div>
    </div>
  )
}
