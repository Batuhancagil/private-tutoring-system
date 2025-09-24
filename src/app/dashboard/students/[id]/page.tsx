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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topic-tracking' | 'schedule'>('dashboard')
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())

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

  // Calculate statistics
  const totalAssignedTopics = assignments.length
  const completedTopics = assignments.filter(a => a.completed).length
  const completionRate = totalAssignedTopics > 0 ? Math.round((completedTopics / totalAssignedTopics) * 100) : 0

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
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-gray-600 mt-1">Öğrenci Dashboard</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/students')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              ← Geri
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">📚</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Atanan Konu</p>
                <p className="text-2xl font-semibold text-gray-900">{totalAssignedTopics}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-600 font-semibold">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tamamlanan Konu</p>
                <p className="text-2xl font-semibold text-gray-900">{completedTopics}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tamamlanma Oranı</p>
                <p className="text-2xl font-semibold text-gray-900">{completionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                  <span className="text-orange-600 font-semibold">❓</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Soru Sayısı</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {assignmentsWithDetails.reduce((total, assignment) => {
                    if (!assignment) return total
                    const topicResources = getResourcesForTopic(assignment.topicId)
                    // Calculate total assigned questions from questionCounts
                    const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                    return total + topicResources.reduce((sum, resource) => {
                      const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                      const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                      return sum + studentCount
                    }, 0)
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-200">
          <div className="p-2">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
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
                className={`flex items-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
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
                className={`flex items-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">📅</span>
                Ders Programı
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
        {/* Student Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Öğrenci Bilgileri</h2>
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

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total Assigned Topics */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Toplam Atanan Konu</p>
                    <p className="text-2xl font-semibold text-gray-900">{assignments.length}</p>
                  </div>
                </div>
              </div>

              {/* Total Questions */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Toplam Hedef Soru</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {assignmentsWithDetails.reduce((total, assignment) => {
                        if (!assignment) return total
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
                </div>
              </div>

              {/* Completed Questions */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Çözülen Soru</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {assignmentsWithDetails.reduce((total, assignment) => {
                        if (!assignment) return total
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
                </div>
              </div>

              {/* Progress Percentage */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Genel İlerleme</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {(() => {
                        const totalTarget = assignmentsWithDetails.reduce((total, assignment) => {
                          if (!assignment) return total
                          const topicResources = getResourcesForTopic(assignment.topicId)
                          const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                          return total + topicResources.reduce((sum, resource) => {
                            const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                            const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                            return sum + studentCount
                          }, 0)
                        }, 0)
                        
                        const totalCompleted = assignmentsWithDetails.reduce((total, assignment) => {
                          if (!assignment) return total
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
                <h2 className="text-xl font-semibold text-gray-800">Konu Takip</h2>
                <button
                  onClick={() => setShowAssignmentModule(!showAssignmentModule)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <span className="mr-2">{showAssignmentModule ? '−' : '+'}</span>
                  {showAssignmentModule ? 'Modülü Gizle' : 'Yeni Konu Ata'}
                </button>
              </div>
              
              {assignments.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📚</div>
                  <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
                  <button
                    onClick={() => setShowAssignmentModule(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
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
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                    📅 Program Oluştur
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    📋 Programı Düzenle
                  </button>
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
            </div>

            {/* Weekly Schedule */}
            {assignments.length > 0 && (
              <div className="space-y-6">
                {(() => {
                  // Group assignments by lesson for weekly distribution
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

                  const lessons = Object.values(lessonGroups)
                  const weeks = Math.ceil(lessons.length / 2) // 2 lessons per week

                  return Array.from({ length: Math.max(weeks, 4) }, (_, weekIndex) => {
                    const weekNumber = weekIndex + 1
                    const startIndex = weekIndex * 2
                    const weekLessons = lessons.slice(startIndex, startIndex + 2)
                    
                    return (
                      <div key={weekNumber} className="bg-white shadow rounded-lg">
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-800">
                            {weekNumber}. Hafta
                          </h3>
                          <p className="text-sm text-gray-500">
                            {weekLessons.length > 0 ? `${weekLessons.length} ders` : 'Ders yok'}
                          </p>
                        </div>
                        
                        <div className="p-4">
                          {weekLessons.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {weekLessons.map((lessonGroup, lessonIndex) => {
                                const dayOfWeek = lessonIndex === 0 ? 'Pazartesi' : 'Çarşamba'
                                
                                return (
                                  <div key={lessonGroup.lesson.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                          {lessonGroup.lesson.group}
                                        </span>
                                        <span className="text-xs text-gray-500">{dayOfWeek}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-sm font-medium text-gray-900">
                                          {lessonGroup.lesson.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {lessonGroup.assignments.length} konu
                                        </div>
                                      </div>
                                    </div>

                                    {/* Topics List */}
                                    <div className="space-y-2">
                                      <h5 className="text-xs font-medium text-gray-700 mb-2">Konular:</h5>
                                      {lessonGroup.assignments.map((assignment) => (
                                        <div key={assignment.id} className="flex items-center justify-between text-xs">
                                          <span className="text-gray-600">
                                            {assignment.topic.order}. {assignment.topic.name}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            assignment.completed 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {assignment.completed ? '✅' : '⏳'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <div className="text-4xl mb-2">📅</div>
                              <p>Bu hafta için ders atanmamış</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
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
