'use client'

import { useState, useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

interface TopicAssignmentModuleProps {
  studentId: string
  onAssignmentComplete?: () => void
  showTitle?: boolean
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  
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

export default function TopicAssignmentModule({ 
  studentId, 
  onAssignmentComplete,
  showTitle = true 
}: TopicAssignmentModuleProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch lessons and topics
  useEffect(() => {
    const fetchLessons = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/lessons')
        const data = await res.json()
        setLessons(data)
      } catch (error) {
        console.error('Failed to fetch lessons:', error)
        setMessage({ type: 'error', text: 'Dersler yüklenirken bir hata oluştu.' })
      } finally {
        setLoading(false)
      }
    }
    fetchLessons()
  }, [])

  // Fetch existing assignments for this student
  useEffect(() => {
    if (studentId) {
      const fetchAssignments = async () => {
        try {
          const res = await fetch(`/api/student-assignments?studentId=${studentId}`)
          const data = await res.json()
          
          // Extract topic IDs from assignments
          const assignedTopicIds = data.map((assignment: { topicId: string }) => assignment.topicId)
          setSelectedTopicIds(assignedTopicIds)
          
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
    }
  }, [studentId, lessons])

  // Group lessons by group name
  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.group]) {
      acc[lesson.group] = []
    }
    acc[lesson.group].push(lesson)
    return acc
  }, {} as Record<string, Lesson[]>)

  // Handle lesson toggle
  const handleLessonToggle = (lessonId: string) => {
    setSelectedLessonIds(prev =>
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    )
    // Also toggle all topics within this lesson
    const lesson = lessons.find(l => l.id === lessonId)
    if (lesson) {
      setSelectedTopicIds(prev => {
        const newSelectedTopics = new Set(prev)
        if (prev.includes(lessonId)) { // If lesson was selected, now deselecting
          lesson.topics.forEach(topic => newSelectedTopics.delete(topic.id))
        } else { // If lesson was deselected, now selecting
          lesson.topics.forEach(topic => newSelectedTopics.add(topic.id))
        }
        return Array.from(newSelectedTopics)
      })
    }
  }

  // Handle topic toggle
  const handleTopicToggle = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    )
  }

  // Check if a lesson group is fully or partially selected
  const isGroupSelected = (groupName: string) => {
    const groupLessons = groupedLessons[groupName] || []
    const allTopicIdsInGroup = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    return allTopicIdsInGroup.length > 0 && allTopicIdsInGroup.every(topicId => selectedTopicIds.includes(topicId))
  }

  const isGroupPartiallySelected = (groupName: string) => {
    const groupLessons = groupedLessons[groupName] || []
    const allTopicIdsInGroup = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    return allTopicIdsInGroup.some(topicId => selectedTopicIds.includes(topicId)) && !isGroupSelected(groupName)
  }

  // Handle group select all/none
  const handleGroupToggle = (groupName: string) => {
    const groupLessons = groupedLessons[groupName] || []
    const allTopicIdsInGroup = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))

    setSelectedTopicIds(prev => {
      const newSelectedTopics = new Set(prev)
      if (isGroupSelected(groupName)) {
        allTopicIdsInGroup.forEach(topicId => newSelectedTopics.delete(topicId))
      } else {
        allTopicIdsInGroup.forEach(topicId => newSelectedTopics.add(topicId))
      }
      return Array.from(newSelectedTopics)
    })

    setSelectedLessonIds(prev => {
      const newSelectedLessons = new Set(prev)
      if (isGroupSelected(groupName)) {
        groupLessons.forEach(lesson => newSelectedLessons.delete(lesson.id))
      } else {
        groupLessons.forEach(lesson => newSelectedLessons.add(lesson.id))
      }
      return Array.from(newSelectedLessons)
    })
  }

  // Handle select all/none
  const handleSelectAll = () => {
    const allTopicIds = lessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    setSelectedTopicIds(allTopicIds)
    setSelectedLessonIds(lessons.map(lesson => lesson.id))
  }

  const handleSelectNone = () => {
    setSelectedTopicIds([])
    setSelectedLessonIds([])
  }

  // Handle drag and drop for topics
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && over) {
      const activeId = String(active.id)
      const overId = String(over.id)

      const activeLesson = lessons.find(lesson => lesson.topics.some(topic => topic.id === activeId))
      const overLesson = lessons.find(lesson => lesson.topics.some(topic => topic.id === overId))

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
    if (!studentId || selectedTopicIds.length === 0) {
      setMessage({ type: 'error', text: 'Lütfen en az bir konu seçin' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/student-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId,
          topicIds: selectedTopicIds
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Konular başarıyla atandı!' })
        if (onAssignmentComplete) {
          onAssignmentComplete()
        }
      } else {
        setMessage({ type: 'error', text: 'Konu atama sırasında hata oluştu' })
      }
    } catch (error) {
      console.error('Error assigning topics:', error)
      setMessage({ type: 'error', text: 'Konu atama sırasında hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {showTitle && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ders ve Konuları Seçin</h3>
      )}
      
      {message && (
        <div className={`p-4 mb-4 text-sm rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`} role="alert">
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600">Dersler yükleniyor...</p>
      ) : Object.keys(groupedLessons).length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
            
            {Object.entries(groupedLessons).map(([groupName, groupLessons]) => (
              <div key={groupName} className="mb-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isGroupSelected(groupName)}
                      onChange={() => handleGroupToggle(groupName)}
                      className={`h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-3 ${
                        isGroupPartiallySelected(groupName) ? 'indeterminate' : ''
                      }`}
                    />
                    <span className="font-medium text-gray-900">{groupName}</span>
                    <span className="ml-2 text-sm text-gray-500">({groupLessons.length} ders)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGroupToggle(groupName)}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      {isGroupSelected(groupName) ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                    </button>
                  </div>
                </div>
                
                <div className="ml-6 mt-2 space-y-2">
                  {groupLessons.map(lesson => (
                    <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={lesson.topics.every(topic => selectedTopicIds.includes(topic.id))}
                            onChange={() => handleLessonToggle(lesson.id)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mr-3"
                          />
                          <span className="font-medium text-gray-900">{lesson.name}</span>
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {lesson.subject}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLessonToggle(lesson.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            {lesson.topics.every(topic => selectedTopicIds.includes(topic.id)) ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                          </button>
                        </div>
                      </div>
                      
                      <SortableContext items={lesson.topics.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleAssignTopics}
              disabled={!studentId || selectedTopicIds.length === 0 || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Atanıyor...' : `${selectedTopicIds.length} Konuyu Ata`}
            </button>
          </div>
        </DndContext>
      ) : (
        <p className="text-gray-600">Henüz ders veya konu bulunamadı. Lütfen müfredat yönetiminden ders ve konu ekleyin.</p>
      )}
    </div>
  )
}
