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

interface Resource {
  id: string
  name: string
  description: string | null
  lessons: {
    id: string
    lesson: {
      id: string
      name: string
      group: string
      type: string
      subject: string | null
    }
    topics: {
      id: string
      topic: {
        id: string
        name: string
        order: number
        lessonId: string
      }
      questionCount?: number
    }[]
  }[]
  createdAt: string
  updatedAt: string
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
  onToggle,
  resources,
  onStudentQuestionCountChange,
  getStudentQuestionCount
}: {
  topic: Topic
  isSelected: boolean
  onToggle: (topicId: string) => void
  resources: { resource: Resource; questionCount: number }[]
  onStudentQuestionCountChange: (topicId: string, resourceId: string, value: string) => void
  getStudentQuestionCount: (topicId: string, resourceId: string) => number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`p-3 border rounded-md bg-white ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
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
      
      {/* Resources for this topic */}
      {resources.length > 0 && (
        <div className="ml-7 mt-2 space-y-2">
          <div className="text-xs font-medium text-gray-600 mb-1">Kaynaklar:</div>
          {resources.map(({ resource, questionCount }) => (
            <div key={resource.id} className="bg-gray-50 px-3 py-2 rounded border">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-700 font-medium">Kaynak: {resource.name}</span>
                <span className="text-blue-600 font-medium">{questionCount} soru</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Öğrenci:</label>
                <input
                  type="number"
                  min="0"
                  max={questionCount}
                  value={getStudentQuestionCount(topic.id, resource.id)}
                  onChange={(e) => onStudentQuestionCountChange(topic.id, resource.id, e.target.value)}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500">soru</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TopicAssignmentModule({ 
  studentId, 
  onAssignmentComplete,
  showTitle = true 
}: TopicAssignmentModuleProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [studentQuestionCounts, setStudentQuestionCounts] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch lessons and resources
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [lessonsRes, resourcesRes] = await Promise.all([
          fetch('/api/lessons'),
          fetch('/api/resources')
        ])
        
        const lessonsData = await lessonsRes.json()
        const resourcesData = await resourcesRes.json()
        
        setLessons(lessonsData)
        setResources(Array.isArray(resourcesData) ? resourcesData : [])
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setMessage({ type: 'error', text: 'Veriler yüklenirken bir hata oluştu.' })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Fetch existing assignments for this student
  useEffect(() => {
    if (studentId) {
      const fetchAssignments = async () => {
        try {
          const res = await fetch(`/api/student-assignments?studentId=${studentId}`)
          const data = await res.json()
          
          // Check if data is an array
          if (!Array.isArray(data)) {
            console.error('Expected array but got:', data)
            return
          }
          
          // Extract topic IDs from assignments
          const assignedTopicIds = data.map((assignment: { topicId: string }) => assignment.topicId)
          setSelectedTopicIds(assignedTopicIds)
          
          // Load question counts from assignments
          const questionCountsData: Record<string, Record<string, number>> = {}
          data.forEach((assignment: { topicId: string; questionCounts: Record<string, number> | null }) => {
            if (assignment.questionCounts) {
              questionCountsData[assignment.topicId] = assignment.questionCounts
            }
          })
          setStudentQuestionCounts(questionCountsData)
          
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

  // Get resources for a specific topic
  const getResourcesForTopic = (topicId: string) => {
    const topicResources: { resource: Resource; questionCount: number }[] = []
    
    resources.forEach(resource => {
      resource.lessons.forEach(resourceLesson => {
        resourceLesson.topics.forEach(resourceTopic => {
          if (resourceTopic.topic.id === topicId) {
            topicResources.push({
              resource,
              questionCount: resourceTopic.questionCount || 0
            })
          }
        })
      })
    })
    
    return topicResources
  }

  // Handle student question count change
  const handleStudentQuestionCountChange = (topicId: string, resourceId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setStudentQuestionCounts(prev => ({
      ...prev,
      [topicId]: {
        ...prev[topicId],
        [resourceId]: numValue
      }
    }))
  }

  // Get student question count for a topic-resource combination
  const getStudentQuestionCount = (topicId: string, resourceId: string) => {
    return studentQuestionCounts[topicId]?.[resourceId] || 0
  }

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

        // Update all topic orders for this lesson to avoid conflicts
        updateAllTopicOrders(activeLesson.id, newTopics)
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

  // Update all topic orders for a lesson
  const updateAllTopicOrders = async (lessonId: string, topics: Topic[]) => {
    try {
      // Update all topics in the lesson with their new order
      const updatePromises = topics.map((topic, index) => 
        fetch(`/api/topics/${topic.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: index + 1 })
        })
      )
      
      await Promise.all(updatePromises)
      console.log('All topic orders updated successfully')
    } catch (error) {
      console.error('Error updating all topic orders:', error)
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
      // Prepare question counts data
      const questionCountsData: Record<string, Record<string, number>> = {}
      selectedTopicIds.forEach(topicId => {
        if (studentQuestionCounts[topicId]) {
          questionCountsData[topicId] = studentQuestionCounts[topicId]
        }
      })

      const response = await fetch('/api/student-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId,
          topicIds: selectedTopicIds,
          questionCounts: questionCountsData
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Konular ve soru sayıları başarıyla atandı!' })
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
                              resources={getResourcesForTopic(topic.id)}
                              onStudentQuestionCountChange={handleStudentQuestionCountChange}
                              getStudentQuestionCount={getStudentQuestionCount}
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
