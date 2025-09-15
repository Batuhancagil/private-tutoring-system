'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

// Sortable Topic Item Component
function SortableTopicItem({ 
  topic, 
  isSelected, 
  onToggle
}: { 
  topic: Topic
  isSelected: boolean
  onToggle: (topicId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-md bg-white ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(topic.id)}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-3"
        />
        <div className="flex items-center flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing mr-3 text-gray-400 hover:text-gray-600"
          >
            ⋮⋮
          </div>
          <span className="text-sm font-medium text-gray-900">
            {topic.order}. {topic.name}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function StudentAssignmentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [assignedTopics, setAssignedTopics] = useState<Topic[]>([])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, lessonsRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/lessons')
        ])
        
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json()
          setStudents(studentsData)
        }
        
        if (lessonsRes.ok) {
          const lessonsData = await lessonsRes.json()
          console.log('Lessons:', lessonsData)
          setLessons(lessonsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
  }, [])

  // Fetch assignments when student is selected
  useEffect(() => {
    if (selectedStudent) {
      const fetchAssignments = async () => {
        try {
          const res = await fetch(`/api/student-assignments?studentId=${selectedStudent}`)
          const data = await res.json()
          console.log('Assignments for student:', data)
          
          // Extract topic IDs from assignments
          const assignedTopicIds = data.map((assignment: { topicId: string }) => assignment.topicId)
          setSelectedTopicIds(assignedTopicIds)
          
          // Find and set the actual topic objects
          const assignedTopics = lessons
            .flatMap(lesson => lesson.topics)
            .filter(topic => assignedTopicIds.includes(topic.id))
          setAssignedTopics(assignedTopics)
          
          // Also select the lessons that contain these topics
          const assignedLessonIds = lessons
            .filter(lesson => lesson.topics.some(topic => assignedTopicIds.includes(topic.id)))
            .map(lesson => lesson.id)
          setSelectedLessonIds(assignedLessonIds)
          
        } catch (error) {
          console.error('Failed to fetch assignments:', error)
        }
      }
      fetchAssignments()
    } else {
      // Clear selections when no student is selected
      setSelectedTopicIds([])
      setSelectedLessonIds([])
    }
  }, [selectedStudent, lessons])

  // Group lessons by group name
  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.group]) {
      acc[lesson.group] = []
    }
    acc[lesson.group].push(lesson)
    return acc
  }, {} as Record<string, Lesson[]>)

  console.log('Grouped lessons:', groupedLessons)

  // Check if a group is selected
  const isGroupSelected = (groupName: string) => {
    return groupedLessons[groupName]?.every(lesson => selectedLessonIds.includes(lesson.id)) || false
  }

  // Check if a group is partially selected
  const isGroupPartiallySelected = (groupName: string) => {
    const groupLessons = groupedLessons[groupName] || []
    const selectedInGroup = groupLessons.filter(lesson => selectedLessonIds.includes(lesson.id))
    return selectedInGroup.length > 0 && selectedInGroup.length < groupLessons.length
  }

  // Handle lesson selection
  const handleLessonToggle = (lessonId: string) => {
    setSelectedLessonIds(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    )
  }

  // Handle group selection
  const handleGroupToggle = (groupName: string) => {
    const groupLessons = groupedLessons[groupName] || []
    const groupLessonIds = groupLessons.map(lesson => lesson.id)
    
    if (isGroupSelected(groupName)) {
      // Deselect all lessons in group
      setSelectedLessonIds(prev => prev.filter(id => !groupLessonIds.includes(id)))
    } else {
      // Select all lessons in group
      setSelectedLessonIds(prev => [...new Set([...prev, ...groupLessonIds])])
    }
  }

  // Handle group select all
  const handleGroupSelectAll = (groupName: string) => {
    const groupLessons = groupedLessons[groupName] || []
    const groupLessonIds = groupLessons.map(lesson => lesson.id)
    setSelectedLessonIds(prev => [...new Set([...prev, ...groupLessonIds])])
  }

  // Handle group select none
  const handleGroupSelectNone = (groupName: string) => {
    const groupLessons = groupedLessons[groupName] || []
    const groupLessonIds = groupLessons.map(lesson => lesson.id)
    setSelectedLessonIds(prev => prev.filter(id => !groupLessonIds.includes(id)))
  }

  // Handle select all
  const handleSelectAll = () => {
    const allLessonIds = lessons.map(lesson => lesson.id)
    setSelectedLessonIds(allLessonIds)
  }

  // Handle select none
  const handleSelectNone = () => {
    setSelectedLessonIds([])
  }

  // Handle topic selection
  const handleTopicToggle = (topicId: string) => {
    setSelectedTopicIds(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    )
  }

  // Handle lesson select all
  const handleLessonSelectAll = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (lesson) {
      const topicIds = lesson.topics.map(topic => topic.id)
      setSelectedTopicIds(prev => [...new Set([...prev, ...topicIds])])
    }
  }

  // Handle lesson select none
  const handleLessonSelectNone = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (lesson) {
      const topicIds = lesson.topics.map(topic => topic.id)
      setSelectedTopicIds(prev => prev.filter(id => !topicIds.includes(id)))
    }
  }

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && over) {
      const activeId = active.id as string
      const overId = over.id as string

      // Find the lesson that contains these topics
      const activeLesson = lessons.find(lesson => 
        lesson.topics.some(topic => topic.id === activeId)
      )
      const overLesson = lessons.find(lesson => 
        lesson.topics.some(topic => topic.id === overId)
      )

      if (activeLesson && overLesson && activeLesson.id === overLesson.id) {
        const oldIndex = activeLesson.topics.findIndex(topic => topic.id === activeId)
        const newIndex = activeLesson.topics.findIndex(topic => topic.id === overId)

        const newTopics = arrayMove(activeLesson.topics, oldIndex, newIndex)
        
        // Update the order in the state
        setLessons(prev => prev.map(lesson => 
          lesson.id === activeLesson.id 
            ? { ...lesson, topics: newTopics }
            : lesson
        ))

        // Update the order in the database
        updateTopicOrder(activeId, newIndex + 1)
      }
    }
  }

  // Update topic order in database
  const updateTopicOrder = async (topicId: string, newOrder: number) => {
    try {
      await fetch(`/api/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder })
      })
    } catch (error) {
      console.error('Error updating topic order:', error)
    }
  }

  // Handle assign topics
  const handleAssignTopics = async () => {
    if (!selectedStudent || selectedTopicIds.length === 0) {
      alert('Lütfen öğrenci ve konu seçin')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/student-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          topicIds: selectedTopicIds
        })
      })

      if (response.ok) {
        alert('Konular başarıyla atandı')
        setSelectedTopicIds([])
        setSelectedLessonIds([])
      } else {
        alert('Konu atama sırasında hata oluştu')
      }
    } catch (error) {
      console.error('Error assigning topics:', error)
      alert('Konu atama sırasında hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Konu Ataması</h1>
        <p className="mt-1 text-sm text-gray-500">
          Öğrencilere ders konularını atayın ve ders programlarını şekillendirin
        </p>
      </div>

      {/* Student Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Öğrenci Seçimi</h3>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        >
          <option value="">Öğrenci seçin</option>
          {students.map(student => (
            <option key={student.id} value={student.id}>
              {student.name} {student.email && `(${student.email})`}
            </option>
          ))}
        </select>
      </div>

      {/* Assigned Topics Display */}
      {selectedStudent && assignedTopics.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Atanmış Konular</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignedTopics.map(topic => {
              const lesson = lessons.find(l => l.topics.some(t => t.id === topic.id))
              return (
                <div key={topic.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">{topic.name}</p>
                      <p className="text-xs text-green-600">{lesson?.name}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Atanmış
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lessons and Topics Selection */}
      {selectedStudent && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ders ve Konuları Seçin</h3>
          
          {Object.keys(groupedLessons).length === 0 ? (
            <p className="text-gray-500">Dersler yükleniyor...</p>
          ) : (
            <>
              {/* Group Selection Controls */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-700">Grup Seçimi</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Tümünü Seç
                    </button>
                    <button
                      onClick={handleSelectNone}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Hiçbirini Seçme
                    </button>
                  </div>
                </div>

                {/* Group Selection */}
                {Object.entries(groupedLessons).map(([groupName, groupLessons]) => (
                  <div key={groupName} className="mb-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isGroupSelected(groupName)}
                          ref={(el) => {
                            if (el) el.indeterminate = isGroupPartiallySelected(groupName)
                          }}
                          onChange={() => handleGroupToggle(groupName)}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-3"
                        />
                        <span className="font-medium text-gray-900">{groupName}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          ({groupLessons.length} ders)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGroupSelectAll(groupName)}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Tümünü Seç
                        </button>
                        <button
                          onClick={() => handleGroupSelectNone(groupName)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Hiçbirini Seçme
                        </button>
                      </div>
                    </div>

                    {/* Lessons in Group */}
                    <div className="ml-6 mt-2 space-y-2">
                      {groupLessons.map(lesson => (
                        <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedLessonIds.includes(lesson.id)}
                                onChange={() => handleLessonToggle(lesson.id)}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-3"
                              />
                              <span className="font-medium text-gray-900">{lesson.name}</span>
                              {lesson.subject && (
                                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {lesson.subject}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleLessonSelectAll(lesson.id)}
                                className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                Tümünü Seç
                              </button>
                              <button
                                onClick={() => handleLessonSelectNone(lesson.id)}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              >
                                Hiçbirini Seçme
                              </button>
                            </div>
                          </div>

                          {/* Topics */}
                          {lesson.topics.length > 0 && (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={lesson.topics.map(topic => topic.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {lesson.topics.map(topic => (
                                    <SortableTopicItem
                                      key={topic.id}
                                      topic={topic}
                                      isSelected={selectedTopicIds.includes(topic.id)}
                                      onToggle={handleTopicToggle}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Assignment Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAssignTopics}
                  disabled={loading || selectedTopicIds.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Atanıyor...' : `${selectedTopicIds.length} Konuyu Ata`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}