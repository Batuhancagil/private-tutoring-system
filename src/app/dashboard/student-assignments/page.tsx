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
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
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

  // Dersleri gruplara ayır
  const groupedLessons = lessons.reduce((acc, lesson) => {
    const group = lesson.group || 'Diğer'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(lesson)
    return acc
  }, {} as Record<string, Lesson[]>)

  // Grup seçim durumunu kontrol et
  const isGroupSelected = (group: string) => {
    const groupLessons = groupedLessons[group]
    return groupLessons.every(lesson => selectedLessonIds.includes(lesson.id))
  }

  const isGroupPartiallySelected = (group: string) => {
    const groupLessons = groupedLessons[group]
    const selectedCount = groupLessons.filter(lesson => selectedLessonIds.includes(lesson.id)).length
    return selectedCount > 0 && selectedCount < groupLessons.length
  }

  // Ders seçim fonksiyonları
  const handleLessonToggle = (lessonId: string) => {
    setSelectedLessonIds(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    )
  }

  const handleGroupToggle = (group: string) => {
    const groupLessons = groupedLessons[group]
    const allSelected = groupLessons.every(lesson => selectedLessonIds.includes(lesson.id))
    
    if (allSelected) {
      // Tümünü kaldır
      setSelectedLessonIds(prev => prev.filter(id => !groupLessons.some(lesson => lesson.id === id)))
    } else {
      // Tümünü seç
      const newLessonIds = groupLessons.map(lesson => lesson.id)
      setSelectedLessonIds(prev => [...prev, ...newLessonIds.filter(id => !prev.includes(id))])
    }
  }

  const handleGroupSelectAll = (group: string) => {
    const groupLessons = groupedLessons[group]
    const newLessonIds = groupLessons.map(lesson => lesson.id)
    setSelectedLessonIds(prev => [...prev, ...newLessonIds.filter(id => !prev.includes(id))])
  }

  const handleGroupSelectNone = (group: string) => {
    const groupLessons = groupedLessons[group]
    setSelectedLessonIds(prev => prev.filter(id => !groupLessons.some(lesson => lesson.id === id)))
  }

  const handleSelectAll = () => {
    const allLessonIds = lessons.map(lesson => lesson.id)
    setSelectedLessonIds(allLessonIds)
  }

  const handleSelectNone = () => {
    setSelectedLessonIds([])
  }

  // Konu seçim fonksiyonları
  const handleTopicToggle = (topicId: string, lessonId: string) => {
    setSelectedTopicIds(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    )
  }

  const handleLessonSelectAll = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (lesson && lesson.topics) {
      const topicIds = lesson.topics.map(topic => topic.id)
      setSelectedTopicIds(prev => [...prev, ...topicIds.filter(id => !prev.includes(id))])
    }
  }

  const handleLessonSelectNone = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (lesson && lesson.topics) {
      const topicIds = lesson.topics.map(topic => topic.id)
      setSelectedTopicIds(prev => prev.filter(id => !topicIds.includes(id)))
    }
  }

  const handleAssignTopics = async () => {
    if (!selectedStudent || selectedTopicIds.length === 0) {
      alert('Lütfen öğrenci ve en az bir konu seçin!')
      return
    }

    setLoading(true)
    try {
      // Burada API endpoint'i oluşturulacak
      console.log('Assigning topics:', {
        studentId: selectedStudent,
        topicIds: selectedTopicIds
      })
      
      alert('Konular başarıyla atandı!')
      setSelectedStudent('')
      setSelectedLessonIds([])
      setSelectedTopicIds([])
    } catch (error) {
      alert('Konu atama sırasında hata oluştu!')
    } finally {
      setLoading(false)
    }
  }

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

          {/* Ders ve Konu Seçimi */}
          {selectedStudent && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Ders ve Konuları Seçin
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Tümünü Seç
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Tümünü Kaldır
                  </button>
                </div>
              </div>
              
              <div className="border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedLessons).map(([group, groupLessons]) => (
                  <div key={group} className="mb-6">
                    {/* Grup Header */}
                    <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-md">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isGroupSelected(group)}
                          ref={(input) => {
                            if (input) input.indeterminate = isGroupPartiallySelected(group)
                          }}
                          onChange={() => handleGroupToggle(group)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm font-semibold text-gray-900">{group}</span>
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleGroupSelectAll(group)}
                          className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50"
                        >
                          Tümünü Seç
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGroupSelectNone(group)}
                          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          Hiçbirini Seçme
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {groupLessons.map((lesson) => (
                        <div key={lesson.id} className="border border-gray-200 rounded-md p-3">
                          {/* Ders Header */}
                          <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedLessonIds.includes(lesson.id)}
                                onChange={() => handleLessonToggle(lesson.id)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm font-medium text-gray-900">{lesson.name}</span>
                            </label>
                            {lesson.topics && lesson.topics.length > 0 && (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleLessonSelectAll(lesson.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                >
                                  Tümünü Seç
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLessonSelectNone(lesson.id)}
                                  className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                                >
                                  Hiçbirini Seçme
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Konular */}
                          {lesson.topics && lesson.topics.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {lesson.topics
                                .sort((a, b) => a.order - b.order)
                                .map((topic) => (
                                <div key={topic.id} className="flex items-center justify-between">
                                  <label className="flex items-center flex-1">
                                    <input
                                      type="checkbox"
                                      checked={selectedTopicIds.includes(topic.id)}
                                      onChange={() => handleTopicToggle(topic.id, lesson.id)}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-900">
                                      {topic.order}. {topic.name}
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {selectedTopicIds.length} konu seçildi
              </p>
            </div>
          )}

          {/* Atama Butonu */}
          <div className="flex justify-end">
            <button
              onClick={handleAssignTopics}
              disabled={loading || !selectedStudent || selectedTopicIds.length === 0}
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
