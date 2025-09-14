'use client'

import { useState, useEffect } from 'react'

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
  student: Student
  topic: Topic
}

export default function StudentAssignmentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedLesson, setSelectedLesson] = useState<string>('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students')
      const data = await response.json()
      if (Array.isArray(data)) {
        setStudents(data)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchLessons = async () => {
    try {
      const response = await fetch('/api/lessons')
      const data = await response.json()
      if (Array.isArray(data)) {
        setLessons(data)
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchLessons()
  }, [])

  const handleLessonChange = (lessonId: string) => {
    setSelectedLesson(lessonId)
    setSelectedTopics([])
  }

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    )
  }

  const handleAssignTopics = async () => {
    if (!selectedStudent || selectedTopics.length === 0) {
      alert('Lütfen öğrenci ve en az bir konu seçin!')
      return
    }

    setLoading(true)
    try {
      // Burada API endpoint'i oluşturulacak
      console.log('Assigning topics:', {
        studentId: selectedStudent,
        topicIds: selectedTopics
      })
      
      alert('Konular başarıyla atandı!')
      setSelectedStudent('')
      setSelectedLesson('')
      setSelectedTopics([])
    } catch (error) {
      alert('Konu atama sırasında hata oluştu!')
    } finally {
      setLoading(false)
    }
  }

  const selectedLessonData = lessons.find(lesson => lesson.id === selectedLesson)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Konu Ataması</h1>
        <p className="mt-2 text-gray-600">
          Öğrencilere ders konularını atayarak ders programlarını şekillendirin.
        </p>
      </div>

      {/* Assignment Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Yeni Konu Ataması
        </h2>
        
        <div className="space-y-6">
          {/* Öğrenci Seçimi */}
          <div>
            <label htmlFor="student" className="block text-sm font-medium text-gray-700 mb-2">
              Öğrenci Seçin *
            </label>
            <select
              id="student"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Öğrenci seçin...</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.email && `(${student.email})`}
                </option>
              ))}
            </select>
          </div>

          {/* Ders Seçimi */}
          <div>
            <label htmlFor="lesson" className="block text-sm font-medium text-gray-700 mb-2">
              Ders Seçin *
            </label>
            <select
              id="lesson"
              value={selectedLesson}
              onChange={(e) => handleLessonChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Ders seçin...</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.name} - {lesson.group} ({lesson.type})
                  {lesson.subject && ` - ${lesson.subject}`}
                </option>
              ))}
            </select>
          </div>

          {/* Konu Seçimi */}
          {selectedLessonData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Konuları Seçin * (Çoklu seçim)
              </label>
              <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
                {selectedLessonData.topics.length === 0 ? (
                  <p className="text-gray-500 text-sm">Bu ders için henüz konu eklenmemiş.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedLessonData.topics
                      .sort((a, b) => a.order - b.order)
                      .map((topic) => (
                        <label key={topic.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedTopics.includes(topic.id)}
                            onChange={() => handleTopicToggle(topic.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900">
                            {topic.order}. {topic.name}
                          </span>
                        </label>
                      ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {selectedTopics.length} konu seçildi
              </p>
            </div>
          )}

          {/* Atama Butonu */}
          <div className="flex justify-end">
            <button
              onClick={handleAssignTopics}
              disabled={loading || !selectedStudent || selectedTopics.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Atanıyor...' : 'Konuları Ata'}
            </button>
          </div>
        </div>
      </div>

      {/* Mevcut Atamalar */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Mevcut Atamalar</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz atama yok</h3>
            <p className="mt-1 text-sm text-gray-500">Öğrencilere konu ataması yapın.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
