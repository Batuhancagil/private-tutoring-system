'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  email: string
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

export default function StudentDashboardPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
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
      setStudent(JSON.parse(studentData))
    } catch (error) {
      router.push('/student/login')
      return
    }

    // Dersleri yükle
    fetchLessons()
  }, [router])

  const fetchLessons = async () => {
    try {
      const response = await fetch('/api/lessons')
      const data = await response.json()
      if (Array.isArray(data)) {
        setLessons(data)
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('studentToken')
    localStorage.removeItem('studentData')
    router.push('/student/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Hoş Geldin!</h2>
              <p className="text-gray-600">
                Bu panelde derslerinizi ve konularınızı görüntüleyebilirsiniz. 
                Öğretmeniniz tarafından eklenen dersler burada görünecektir.
              </p>
            </div>
          </div>

          {/* Lessons Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Derslerim</h2>
              
              {lessons.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz ders yok</h3>
                  <p className="mt-1 text-sm text-gray-500">Öğretmeniniz ders eklediğinde burada görünecek.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson) => (
                    <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{lesson.name}</h3>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Grup: {lesson.group}</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              lesson.type === 'TYT' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {lesson.type}
                            </span>
                            {lesson.subject && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                {lesson.subject}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {lesson.topics.length} konu
                        </div>
                      </div>
                      
                      {lesson.topics.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Konular:</h4>
                          <div className="flex flex-wrap gap-2">
                            {lesson.topics
                              .sort((a, b) => a.order - b.order)
                              .map((topic) => (
                                <span
                                  key={topic.id}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {topic.name}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
