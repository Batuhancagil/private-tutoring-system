'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Topic {
  id: string
  name: string
  order: number
  lessonId: string
  createdAt: string
}

interface Lesson {
  id: string
  name: string
  group: string
  topics: Topic[]
  createdAt: string
}

// Sürükle-bırak için konu bileşeni
function SortableTopicItem({ topic, onUpdateOrder }: { topic: Topic; onUpdateOrder: (topicId: string, newOrder: number) => void }) {
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
      {...attributes}
      {...listeners}
      className="flex items-center justify-between bg-white p-3 rounded border cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-center">
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-3">
          {topic.order}
        </span>
        <span className="text-sm text-gray-900">{topic.name}</span>
      </div>
      <div className="flex space-x-2">
        <button className="text-xs text-blue-600 hover:text-blue-900">
          Düzenle
        </button>
        <button className="text-xs text-red-600 hover:text-red-900">
          Sil
        </button>
      </div>
    </div>
  )
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [formData, setFormData] = useState({ name: '', group: '' })
  const [loading, setLoading] = useState(false)
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [topicForms, setTopicForms] = useState<Record<string, { name: string }>>({})
  const [topicLoading, setTopicLoading] = useState<Record<string, boolean>>({})
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  // Form her zaman görünür olacak

  const fetchLessons = async () => {
    try {
      const response = await fetch('/api/lessons')
      const data = await response.json()
      
      // API'den gelen verinin array olduğundan emin ol
      if (Array.isArray(data)) {
        setLessons(data)
      } else {
        console.error('API returned non-array data:', data)
        setLessons([])
      }
    } catch (error) {
      console.error('Dersler yüklenirken hata:', error)
      setLessons([])
    }
  }

  const toggleLessonExpansion = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons)
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId)
    } else {
      newExpanded.add(lessonId)
    }
    setExpandedLessons(newExpanded)
  }

  const handleTopicSubmit = async (lessonId: string) => {
    const topicData = topicForms[lessonId]
    if (!topicData?.name) {
      alert('Konu adı zorunludur!')
      return
    }

    setTopicLoading(prev => ({ ...prev, [lessonId]: true }))

    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          name: topicData.name
        })
      })

      if (response.ok) {
        setTopicForms(prev => ({ ...prev, [lessonId]: { name: '' } }))
        fetchLessons()
      } else {
        const error = await response.json()
        alert(error.error || 'Konu eklenirken hata oluştu!')
      }
    } catch (error) {
      alert('Konu eklenirken hata oluştu!')
    } finally {
      setTopicLoading(prev => ({ ...prev, [lessonId]: false }))
    }
  }

  const updateTopicForm = (lessonId: string, field: 'name', value: string) => {
    setTopicForms(prev => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [field]: value
      }
    }))
  }

  const handleDragEnd = async (event: any, lessonId: string) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const lesson = lessons.find(l => l.id === lessonId)
      if (!lesson) return

      const oldIndex = lesson.topics.findIndex(topic => topic.id === active.id)
      const newIndex = lesson.topics.findIndex(topic => topic.id === over.id)

      const newTopics = arrayMove(lesson.topics, oldIndex, newIndex)
      
      // Sıralamayı güncelle
      const updatedTopics = newTopics.map((topic, index) => ({
        ...topic,
        order: index + 1
      }))

      // UI'yi güncelle
      setLessons(prev => prev.map(l => 
        l.id === lessonId 
          ? { ...l, topics: updatedTopics }
          : l
      ))

      // API'ye sıralama güncellemelerini gönder
      for (const topic of updatedTopics) {
        try {
          await fetch(`/api/topics/${topic.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: topic.order })
          })
        } catch (error) {
          console.error('Failed to update topic order:', error)
        }
      }
    }
  }

  useEffect(() => {
    fetchLessons()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.group) {
      alert('Ders adı ve grup zorunludur!')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ name: '', group: '' })
        fetchLessons()
        // Alert kaldırıldı - sessiz güncelleme
      } else {
        const error = await response.json()
        alert(error.error || 'Ders eklenirken hata oluştu!')
      }
    } catch (error) {
      alert('Ders eklenirken hata oluştu!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ders Yönetimi</h1>
          <p className="mt-2 text-gray-600">
            Derslerinizi ekleyin, düzenleyin ve yönetin.
          </p>
        </div>
      </div>

      {/* Ders Ekleme Formu */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Ders Ekle</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Ders Adı *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Örn: Matematik, Fizik, Kimya..."
                  required
                />
              </div>
              <div>
                <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-1">
                  Grup *
                </label>
                <input
                  type="text"
                  id="group"
                  value={formData.group}
                  onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="TYT MAT, TYT FEN, AYT MAT, AYT FEN yazabilirsin"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Ekleniyor...' : 'Ders Ekle'}
              </button>
            </div>
          </form>
        </div>

      {/* Ders Listesi */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Ders Listesi ({lessons.length})
          </h3>
          {lessons.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz ders yok</h3>
              <p className="mt-1 text-sm text-gray-500">Başlamak için yeni bir ders ekleyin.</p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ders Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grup
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oluşturulma Tarihi
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">İşlemler</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lessons.map((lesson) => (
                    <>
                      <tr key={lesson.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            <button
                              onClick={() => toggleLessonExpansion(lesson.id)}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              {expandedLessons.has(lesson.id) ? '▼' : '▶'}
                            </button>
                            {lesson.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lesson.group}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(lesson.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => toggleLessonExpansion(lesson.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            {expandedLessons.has(lesson.id) ? 'Konuları Gizle' : 'Konu Ekle'}
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Sil
                          </button>
                        </td>
                      </tr>
                      {expandedLessons.has(lesson.id) && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Konu Ekleme Formu */}
                              <div className="bg-white p-4 rounded-lg border">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Yeni Konu Ekle</h4>
                                <div className="flex gap-4">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Konu Adı
                                    </label>
                                    <input
                                      type="text"
                                      value={topicForms[lesson.id]?.name || ''}
                                      onChange={(e) => updateTopicForm(lesson.id, 'name', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                                      placeholder="Örn: Fonksiyonlar, Türev..."
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      onClick={() => handleTopicSubmit(lesson.id)}
                                      disabled={topicLoading[lesson.id]}
                                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 text-sm"
                                    >
                                      {topicLoading[lesson.id] ? 'Ekleniyor...' : 'Konu Ekle'}
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Sıralama otomatik olarak atanacak (1, 2, 3...)
                                </p>
                              </div>

                              {/* Mevcut Konular */}
                              {lesson.topics && lesson.topics.length > 0 ? (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                                    Mevcut Konular 
                                    <span className="text-xs text-gray-500 ml-2">
                                      (Sürükle-bırak ile sıralayabilirsiniz)
                                    </span>
                                  </h4>
                                  <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(event) => handleDragEnd(event, lesson.id)}
                                  >
                                    <SortableContext
                                      items={lesson.topics.map(topic => topic.id)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      <div className="space-y-2">
                                        {lesson.topics.map((topic) => (
                                          <SortableTopicItem
                                            key={topic.id}
                                            topic={topic}
                                            onUpdateOrder={() => {}}
                                          />
                                        ))}
                                      </div>
                                    </SortableContext>
                                  </DndContext>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                  Henüz konu eklenmemiş.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
