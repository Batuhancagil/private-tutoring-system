'use client'

import { useState, useEffect, useMemo } from 'react'
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

interface TopicAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  onAssignmentComplete?: () => void
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
      className={`p-4 border-2 rounded-lg transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(topic.id)}
            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3 cursor-pointer"
          />
          <div className="flex items-center flex-1">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing mr-3 text-gray-400 hover:text-gray-600 text-xl"
            >
              ⋮⋮
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {topic.order}. {topic.name}
            </span>
          </div>
        </div>
      </div>
      
      {/* Resources for this topic */}
      {resources.length > 0 && isSelected && (
        <div className="ml-8 mt-3 space-y-2 pl-4 border-l-2 border-blue-200">
          <div className="text-xs font-medium text-gray-600 mb-2">Kaynaklar:</div>
          {resources.map(({ resource, questionCount }) => (
            <div key={resource.id} className="bg-white px-3 py-2 rounded border border-gray-200">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-700 font-medium truncate">{resource.name}</span>
                <span className="text-blue-600 font-semibold ml-2">{questionCount} soru</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">Öğrenci için:</label>
                <input
                  type="number"
                  min="0"
                  max={questionCount}
                  value={getStudentQuestionCount(topic.id, resource.id)}
                  onChange={(e) => onStudentQuestionCountChange(topic.id, resource.id, e.target.value)}
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500">/{questionCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TopicAssignmentModal({ 
  isOpen, 
  onClose, 
  studentId, 
  onAssignmentComplete 
}: TopicAssignmentModalProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([])
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([])
  const [studentQuestionCounts, setStudentQuestionCounts] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch lessons and resources
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true)
        try {
          const [lessonsRes, resourcesRes] = await Promise.all([
            fetch('/api/lessons'),
            fetch('/api/resources')
          ])
          
          const lessonsData = await lessonsRes.json()
          const resourcesData = await resourcesRes.json()
          
          setLessons(Array.isArray(lessonsData) ? lessonsData : [])
          setResources(Array.isArray(resourcesData) ? resourcesData : [])
        } catch (error) {
          console.error('Failed to fetch data:', error)
          setMessage({ type: 'error', text: 'Veriler yüklenirken bir hata oluştu.' })
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }
  }, [isOpen])

  // Fetch existing assignments for this student
  useEffect(() => {
    const safeLessons = Array.isArray(lessons) ? lessons : []
    if (isOpen && studentId && safeLessons.length > 0) {
      const fetchAssignments = async () => {
        try {
          const res = await fetch(`/api/student-assignments?studentId=${studentId}`)
          const data = await res.json()

          if (!Array.isArray(data)) {
            return
          }
          
          const assignedTopicIds = data.map((assignment: { topicId?: string; lessonTopicId?: string }) => 
            assignment.topicId || assignment.lessonTopicId || ''
          ).filter(Boolean)
          setSelectedTopicIds(assignedTopicIds)
          
          const questionCountsData: Record<string, Record<string, number>> = {}
          data.forEach((assignment: { 
            topicId?: string
            lessonTopicId?: string
            questionCounts?: Record<string, Record<string, number>> | null
            studentAssignedResourceTopicQuestionCounts?: Record<string, Record<string, number>> | null
          }) => {
            const topicId = assignment.topicId || assignment.lessonTopicId
            if (!topicId) return
            
            const counts = assignment.questionCounts || assignment.studentAssignedResourceTopicQuestionCounts
            if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
              // Handle nested structure: { resourceId: { studentId: count } } or { resourceId: count }
              const normalizedCounts: Record<string, Record<string, number>> = {}
              Object.entries(counts as Record<string, unknown>).forEach(([resourceId, value]) => {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  normalizedCounts[resourceId] = value as Record<string, number>
                } else if (typeof value === 'number') {
                  // If it's a flat structure, convert to nested
                  normalizedCounts[resourceId] = { [studentId]: value }
                }
              })
              if (Object.keys(normalizedCounts).length > 0) {
                // Type assertion needed due to TypeScript inference limitations
                (questionCountsData as any)[topicId] = normalizedCounts
              }
            }
          })
          setStudentQuestionCounts(questionCountsData)
          
          const assignedLessonIds = safeLessons
            .filter(lesson => lesson.topics.some(topic => assignedTopicIds.includes(topic.id)))
            .map(lesson => lesson.id)
          setSelectedLessonIds(assignedLessonIds)
          
        } catch (error) {
          console.error('Failed to fetch assignments:', error)
        }
      }
      fetchAssignments()
    }
  }, [isOpen, studentId, lessons])

  // Filter lessons and topics based on search query
  const filteredGroupedLessons = useMemo(() => {
    const safeLessons = Array.isArray(lessons) ? lessons : []
    const grouped = safeLessons.reduce((acc, lesson) => {
      if (!acc[lesson.group]) {
        acc[lesson.group] = []
      }
      acc[lesson.group].push(lesson)
      return acc
    }, {} as Record<string, Lesson[]>)

    if (!searchQuery.trim()) {
      return grouped
    }

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, Lesson[]> = {}

    Object.entries(grouped).forEach(([groupName, groupLessons]) => {
      const filteredLessons = groupLessons
        .map(lesson => {
          const filteredTopics = lesson.topics.filter(topic =>
            topic.name.toLowerCase().includes(query) ||
            lesson.name.toLowerCase().includes(query) ||
            lesson.group.toLowerCase().includes(query) ||
            lesson.subject?.toLowerCase().includes(query)
          )
          return filteredTopics.length > 0 ? { ...lesson, topics: filteredTopics } : null
        })
        .filter(Boolean) as Lesson[]

      if (filteredLessons.length > 0) {
        filtered[groupName] = filteredLessons
      }
    })

    return filtered
  }, [lessons, searchQuery])

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
    const safeLessons = Array.isArray(lessons) ? lessons : []
    const lesson = safeLessons.find(l => l.id === lessonId)
    if (!lesson) return

    const isLessonSelected = lesson.topics.every(topic => selectedTopicIds.includes(topic.id))

    setSelectedLessonIds(prev =>
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    )

    setSelectedTopicIds(prev => {
      const newSelectedTopics = new Set(prev)
      if (isLessonSelected) {
        lesson.topics.forEach(topic => newSelectedTopics.delete(topic.id))
      } else {
        lesson.topics.forEach(topic => newSelectedTopics.add(topic.id))
      }
      return Array.from(newSelectedTopics)
    })
  }

  // Handle topic toggle
  const handleTopicToggle = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    )
  }

  // Check if a lesson group is fully or partially selected
  const isGroupSelected = (groupName: string) => {
    const groupLessons = filteredGroupedLessons[groupName] || []
    const allTopicIdsInGroup = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    return allTopicIdsInGroup.length > 0 && allTopicIdsInGroup.every(topicId => selectedTopicIds.includes(topicId))
  }

  const isGroupPartiallySelected = (groupName: string) => {
    const groupLessons = filteredGroupedLessons[groupName] || []
    const allTopicIdsInGroup = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    return allTopicIdsInGroup.some(topicId => selectedTopicIds.includes(topicId)) && !isGroupSelected(groupName)
  }

  // Handle group select all/none
  const handleGroupToggle = (groupName: string) => {
    const groupLessons = filteredGroupedLessons[groupName] || []
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
    const safeLessons = Array.isArray(lessons) ? lessons : []
    const allTopicIds = safeLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    setSelectedTopicIds(allTopicIds)
    setSelectedLessonIds(safeLessons.map(lesson => lesson.id))
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

      const safeLessons = Array.isArray(lessons) ? lessons : []
      const activeLesson = safeLessons.find(lesson => lesson.topics.some(topic => topic.id === activeId))
      const overLesson = safeLessons.find(lesson => lesson.topics.some(topic => topic.id === overId))

      if (activeLesson && overLesson && activeLesson.id === overLesson.id) {
        const oldIndex = activeLesson.topics.findIndex(topic => topic.id === activeId)
        const newIndex = activeLesson.topics.findIndex(topic => topic.id === overId)

        const newTopics = arrayMove(activeLesson.topics, oldIndex, newIndex)
        
        setLessons(prev => prev.map(lesson => 
          lesson.id === activeLesson.id 
            ? { ...lesson, topics: newTopics }
            : lesson
        ))

        updateAllTopicOrders(activeLesson.id, newTopics)
      }
    }
  }

  // Update all topic orders for a lesson
  const updateAllTopicOrders = async (lessonId: string, topics: Topic[]) => {
    try {
      const updatePromises = topics.map((topic, index) =>
        fetch(`/api/topics/${topic.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: index + 1 })
        })
      )
      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Error updating all topic orders:', error)
    }
  }

  // Handle assign topics
  const handleAssignTopics = async () => {
    if (!studentId) {
      setMessage({ type: 'error', text: 'Öğrenci seçilmedi' })
      return
    }

    setLoading(true)
    setMessage(null)
    try {
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
        setTimeout(() => {
          if (onAssignmentComplete) {
            onAssignmentComplete()
          }
          onClose()
        }, 1500)
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Konu atama sırasında hata oluştu' })
      }
    } catch (error) {
      console.error('Error assigning topics:', error)
      setMessage({ type: 'error', text: 'Konu atama sırasında hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Konu Ata</h2>
              <p className="text-sm text-gray-600 mt-1">Öğrenciye konu ve soru sayıları atayın</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Konu, ders veya grup ara..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {message && (
              <div className={`p-4 mb-4 text-sm rounded-lg ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`} role="alert">
                {message.text}
              </div>
            )}

            {loading && (!Array.isArray(lessons) || lessons.length === 0) ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Dersler yükleniyor...</p>
              </div>
            ) : Object.keys(filteredGroupedLessons).length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-700">Grup Seçimi</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        Tümünü Seç
                      </button>
                      <button
                        onClick={handleSelectNone}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(filteredGroupedLessons).map(([groupName, groupLessons]) => (
                      <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-gray-50">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isGroupSelected(groupName)}
                              onChange={() => handleGroupToggle(groupName)}
                              className={`h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3 ${
                                isGroupPartiallySelected(groupName) ? 'opacity-50' : ''
                              }`}
                            />
                            <span className="font-semibold text-gray-900">{groupName}</span>
                            <span className="ml-3 text-sm text-gray-500">({groupLessons.length} ders)</span>
                          </div>
                          <button
                            onClick={() => handleGroupToggle(groupName)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            {isGroupSelected(groupName) ? 'Kaldır' : 'Tümünü Seç'}
                          </button>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          {groupLessons.map(lesson => (
                            <div key={lesson.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={lesson.topics.every(topic => selectedTopicIds.includes(topic.id))}
                                    onChange={() => handleLessonToggle(lesson.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                                  />
                                  <span className="font-medium text-gray-900">{lesson.name}</span>
                                  {lesson.subject && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                      {lesson.subject}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleLessonToggle(lesson.id)}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                >
                                  {lesson.topics.every(topic => selectedTopicIds.includes(topic.id)) ? 'Kaldır' : 'Tümünü Seç'}
                                </button>
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
                </div>
              </DndContext>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  {searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz ders veya konu bulunamadı. Lütfen müfredat yönetiminden ders ve konu ekleyin.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-blue-600">{selectedTopicIds.length}</span> konu seçildi
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAssignTopics}
                disabled={!studentId || loading || selectedTopicIds.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Atanıyor...' : `${selectedTopicIds.length} Konuyu Ata`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

