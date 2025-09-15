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
  topic: Topic & {
    lesson: Lesson
  }
}

export default function StudentDetailPage() {
  const params = useParams()
  const studentId = params.id as string
  
  const [student, setStudent] = useState<Student | null>(null)
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
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

        // Fetch assignments
        const assignmentsRes = await fetch(`/api/student-assignments?studentId=${studentId}`)
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json()
          setAssignments(assignmentsData)
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

  // Group assignments by lesson
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const lessonId = assignment.topic.lesson.id
    if (!acc[lessonId]) {
      acc[lessonId] = {
        lesson: assignment.topic.lesson,
        topics: []
      }
    }
    acc[lessonId].topics.push(assignment)
    return acc
  }, {} as Record<string, { lesson: Lesson, topics: StudentAssignment[] }>)

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
              <p className="text-gray-600 mt-1">Öğrenci Detay Sayfası</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

        {/* Assigned Topics */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Atanmış Konular</h2>
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
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Henüz konu atanmamış</p>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                İlk Konuyu Ata
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(groupedAssignments).map(({ lesson, topics }) => (
                <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {lesson.group}
                    </span>
                    {lesson.name} ({lesson.type} - {lesson.subject})
                  </h3>
                  <div className="space-y-1">
                    {topics.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-700">
                          {assignment.topic.order}. {assignment.topic.name}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          assignment.completed 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {assignment.completed ? 'Tamamlandı' : 'Devam Ediyor'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
