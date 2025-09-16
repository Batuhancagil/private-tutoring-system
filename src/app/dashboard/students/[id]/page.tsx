'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
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

interface Resource {
  id: string
  name: string
  description: string
  lessonIds: string[]
  questionCount: number
  createdAt: string
}

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = params.id as string
  
  const [student, setStudent] = useState<Student | null>(null)
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignmentModule, setShowAssignmentModule] = useState(false)

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
    console.log('Available lessons:', lessons.length)
    
    const result = resources.filter(resource => {
      console.log('Processing resource:', resource.name, 'lessonIds:', resource.lessonIds)
      
      // Check if resource has lessonIds and it's an array
      if (!resource.lessonIds || !Array.isArray(resource.lessonIds)) {
        console.log('Resource has no lessonIds or not array:', resource.lessonIds)
        return false
      }
      
      return resource.lessonIds.some(lessonId => {
        const lesson = lessons.find(lesson => lesson.id === lessonId)
        console.log('Found lesson for lessonId:', lessonId, lesson?.name)
        if (!lesson || !lesson.topics || !Array.isArray(lesson.topics)) {
          console.log('Lesson not found or no topics:', lesson)
          return false
        }
        const hasTopic = lesson.topics.some(topic => topic.id === topicId)
        console.log('Lesson has topic:', hasTopic)
        return hasTopic
      })
    })
    
    console.log('Found resources for topic:', result.length)
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
            onClick={() => window.close()}
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
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Kapat
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
                    return total + topicResources.reduce((sum, resource) => {
                      // Geçici olarak rastgele soru sayısı (questionCounts henüz yok)
                      return sum + Math.floor(Math.random() * resource.questionCount) + 1
                    }, 0)
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

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
            <div className="space-y-6">
              {assignmentsWithDetails.map((assignment, index) => {
                if (!assignment) return null
                const topicResources = getResourcesForTopic(assignment.topicId)
                const totalStudentQuestions = topicResources.reduce((sum, resource) => {
                  // Geçici olarak rastgele soru sayısı (questionCounts henüz yok)
                  return sum + Math.floor(Math.random() * resource.questionCount) + 1
                }, 0)
                
                return (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                            {assignment.lesson.group}
                          </span>
                          <span className="text-sm text-gray-500">
                            {assignment.lesson.name} - {assignment.lesson.subject}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {assignment.topic.order}. {assignment.topic.name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                            Toplam: {totalStudentQuestions} soru
                          </span>
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                            {topicResources.length} kaynak
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            assignment.completed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {assignment.completed ? '✅ Tamamlandı' : '⏳ Devam Ediyor'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {topicResources.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Kaynak Detayları:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {topicResources.map(resource => {
                            // Geçici olarak rastgele soru sayısı (questionCounts henüz yok)
                            const studentCount = Math.floor(Math.random() * resource.questionCount) + 1
                            return (
                              <div key={resource.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-sm font-medium text-gray-800 truncate">
                                    {resource.name}
                                  </h5>
                                </div>
                                
                                {/* Kaynak/Çözülmesi Gereken Formatı */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Kaynak:</span>
                                    <span className="text-sm font-semibold text-gray-700">
                                      {resource.questionCount} Soru
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Çözülmesi Gereken:</span>
                                    <span className="text-sm font-semibold text-blue-600">
                                      {studentCount} Soru
                                    </span>
                                  </div>
                                </div>
                                
                                {/* İlerleme Çubuğu */}
                                {studentCount > 0 && (
                                  <div className="mt-3">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${Math.min((studentCount / resource.questionCount) * 100, 100)}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 text-right">
                                      %{Math.round((studentCount / resource.questionCount) * 100)}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Özet Satır */}
                                <div className="mt-3 pt-2 border-t border-gray-200">
                                  <div className="text-xs text-center text-gray-600">
                                    {resource.name} - {resource.questionCount} Soru / {studentCount} Soru
                                  </div>
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
          )}
        </div>

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
