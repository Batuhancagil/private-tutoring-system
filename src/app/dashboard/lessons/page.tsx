'use client'

import { useState, useEffect, Fragment } from 'react'
import { lessonsApi, topicsApi, ApiError } from '@/lib/api'
import { LessonResponse, LessonTopicResponse } from '@/types/api'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Topic = LessonTopicResponse
type Lesson = LessonResponse
type LessonWithTopics = Lesson & { topics: Topic[] }
type LessonDraft = {
  name: string
  group: string
  type: 'TYT' | 'AYT'
  subject: string
}

const defaultLessonDraft: LessonDraft = {
  name: '',
  group: '',
  type: 'TYT',
  subject: '',
}

function normalizeLesson(lesson: Lesson): LessonWithTopics {
  return {
    ...lesson,
    topics: lesson.topics ? [...lesson.topics].sort((a, b) => a.order - b.order) : [],
  }
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _omitted, ...rest } = record
  return rest
}

function SortableTopicItem({
  topic,
  onEdit,
  onDelete,
}: {
  topic: Topic
  onEdit: (topic: Topic, lessonId: string) => void
  onDelete: (topicId: string, lessonId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-white p-3 rounded border hover:shadow-md transition-shadow"
    >
      <div {...attributes} {...listeners} className="flex items-center cursor-move flex-1">
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-3">{topic.order}</span>
        <span className="text-sm text-gray-900">{topic.name}</span>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(topic, topic.lessonId)
          }}
          className="text-xs text-blue-600 hover:text-blue-900"
        >
          Düzenle
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(topic.id, topic.lessonId)
          }}
          className="text-xs text-red-600 hover:text-red-900"
        >
          Sil
        </button>
      </div>
    </div>
  )
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<LessonWithTopics[]>([])
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [newLessonDraft, setNewLessonDraft] = useState<LessonDraft>(defaultLessonDraft)
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, LessonDraft>>({})
  const [updatingLessonIds, setUpdatingLessonIds] = useState<Record<string, boolean>>({})
  const [deletingLessonIds, setDeletingLessonIds] = useState<Record<string, boolean>>({})
  const [topicForms, setTopicForms] = useState<Record<string, { name: string }>>({})
  const [topicLoading, setTopicLoading] = useState<Record<string, boolean>>({})
  const [editingTopic, setEditingTopic] = useState<{ topic: Topic; lessonId: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchLessons = async () => {
    try {
      const response = await lessonsApi.getAll()
      const normalized = response.data.map((lesson) => normalizeLesson(lesson))
      setLessons(normalized)
    } catch (error) {
      console.error('Dersler yüklenirken hata:', error)
      if (error instanceof ApiError) {
        alert(`Dersler yüklenirken hata oluştu: ${error.message}`)
      }
      setLessons([])
    }
  }

  useEffect(() => {
    fetchLessons()
  }, [])

  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const updated = new Set(prev)
      if (updated.has(lessonId)) {
        updated.delete(lessonId)
      } else {
        updated.add(lessonId)
      }
      return updated
    })
  }

  const updateLessonTopics = (lessonId: string, updater: (topics: Topic[]) => Topic[]) => {
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              topics: updater([...lesson.topics]).map((topic) => ({ ...topic })).sort((a, b) => a.order - b.order),
            }
          : lesson
      )
    )
  }

  const handleNewLessonChange = <K extends keyof LessonDraft>(field: K, value: LessonDraft[K]) => {
    setNewLessonDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleLessonDraftChange = <K extends keyof LessonDraft>(
    lessonId: string,
    field: K,
    value: LessonDraft[K]
  ) => {
    setLessonDrafts((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] || defaultLessonDraft),
        [field]: value,
      },
    }))
  }

  const handleStartEditLesson = (lesson: LessonWithTopics) => {
    setEditingLessonId(lesson.id)
    setLessonDrafts((prev) => ({
      ...prev,
      [lesson.id]: {
        name: lesson.name,
        group: lesson.group,
        type: lesson.type as 'TYT' | 'AYT',
        subject: lesson.subject ?? '',
      },
    }))
  }

  const handleCancelEditLesson = (lessonId: string) => {
    setLessonDrafts((prev) => omitKey(prev, lessonId))
    setEditingLessonId((current) => (current === lessonId ? null : current))
  }

  const handleCreateLesson = async () => {
    if (!newLessonDraft.name.trim() || !newLessonDraft.group.trim()) {
      alert('Ders adı ve grup zorunludur!')
      return
    }

    setCreatingLesson(true)

    try {
      const createdLesson = await lessonsApi.create({
        name: newLessonDraft.name.trim(),
        group: newLessonDraft.group.trim(),
        type: newLessonDraft.type,
        subject: newLessonDraft.subject.trim(),
      })

      const normalized = normalizeLesson({ ...createdLesson, topics: [] })

      setLessons((prev) => [normalized, ...prev])
      setNewLessonDraft(defaultLessonDraft)
    } catch (error) {
      console.error('Ders ekleme hatası:', error)
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Ders eklenirken hata oluştu!')
      }
    } finally {
      setCreatingLesson(false)
    }
  }

  const handleSaveLesson = async (lessonId: string) => {
    const draft = lessonDrafts[lessonId]
    if (!draft || !draft.name.trim() || !draft.group.trim()) {
      alert('Ders adı ve grup zorunludur!')
      return
    }

    setUpdatingLessonIds((prev) => ({ ...prev, [lessonId]: true }))

    try {
      const updatedLesson = await lessonsApi.update(lessonId, {
        name: draft.name.trim(),
        group: draft.group.trim(),
        type: draft.type,
        subject: draft.subject.trim(),
      })

      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                ...updatedLesson,
                topics: lesson.topics,
              }
            : lesson
        )
      )

      setLessonDrafts((prev) => omitKey(prev, lessonId))
      setEditingLessonId((current) => (current === lessonId ? null : current))
    } catch (error) {
      console.error('Error updating lesson:', error)
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Ders güncellenirken hata oluştu!')
      }
    } finally {
      setUpdatingLessonIds((prev) => omitKey(prev, lessonId))
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Bu dersi silmek istediğinizden emin misiniz? Tüm konular da silinecek.')) return

    setDeletingLessonIds((prev) => ({ ...prev, [lessonId]: true }))
    const lessonSnapshot = lessons

    setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId))

    try {
      await lessonsApi.delete(lessonId)
      setExpandedLessons((prev) => {
        const updated = new Set(prev)
        updated.delete(lessonId)
        return updated
      })
      setLessonDrafts((prev) => omitKey(prev, lessonId))
      setEditingLessonId((current) => (current === lessonId ? null : current))
    } catch (error) {
      console.error('Error deleting lesson:', error)
      setLessons(() => [...lessonSnapshot])
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Ders silinirken hata oluştu!')
      }
    } finally {
      setDeletingLessonIds((prev) => omitKey(prev, lessonId))
    }
  }

  const handleTopicSubmit = async (lessonId: string) => {
    const topicData = topicForms[lessonId]
    if (!topicData?.name.trim()) {
      alert('Konu adı zorunludur!')
      return
    }

    setTopicLoading((prev) => ({ ...prev, [lessonId]: true }))

    try {
      const newTopic = await topicsApi.create({
        lessonId,
        name: topicData.name.trim(),
      })

      updateLessonTopics(lessonId, (topics) => [...topics, newTopic])
      setTopicForms((prev) => ({ ...prev, [lessonId]: { name: '' } }))
    } catch (error) {
      console.error('Konu ekleme hatası:', error)
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Konu eklenirken hata oluştu!')
      }
    } finally {
      setTopicLoading((prev) => ({ ...prev, [lessonId]: false }))
    }
  }

  const updateTopicForm = (lessonId: string, field: 'name', value: string) => {
    setTopicForms((prev) => ({
      ...prev,
      [lessonId]: {
        ...prev[lessonId],
        [field]: value,
      },
    }))
  }

  const handleEditTopic = (topic: Topic, lessonId: string) => {
    setEditingTopic({ topic, lessonId })
  }

  const handleUpdateTopic = async () => {
    if (!editingTopic || !editingTopic.topic.name.trim()) return

    try {
      const updatedTopic = await topicsApi.update(editingTopic.topic.id, {
        name: editingTopic.topic.name.trim(),
      })
      const targetLessonId = editingTopic.lessonId
      setEditingTopic(null)

      updateLessonTopics(targetLessonId, (topics) =>
        topics.map((topic) => (topic.id === updatedTopic.id ? updatedTopic : topic))
      )
    } catch (error) {
      console.error('Error updating topic:', error)
      if (error instanceof ApiError) {
        alert(error.message)
      }
    }
  }

  const handleDeleteTopic = async (topicId: string, lessonId: string) => {
    if (!confirm('Bu konuyu silmek istediğinizden emin misiniz?')) return

    const lesson = lessons.find((item) => item.id === lessonId)
    if (!lesson) return

    const previousTopics = lesson.topics
    const remainingTopics = previousTopics
      .filter((topic) => topic.id !== topicId)
      .map((topic, index) => ({ ...topic, order: index + 1 }))

    updateLessonTopics(lessonId, () => remainingTopics)

    try {
      await topicsApi.delete(topicId)

      if (remainingTopics.length > 0) {
        try {
          await topicsApi.reorder(lessonId, remainingTopics.map((topic) => topic.id))
        } catch (reorderError) {
          console.error('Failed to normalize topic order after deletion:', reorderError)
        }
      }
    } catch (error) {
      console.error('Error deleting topic:', error)
      updateLessonTopics(lessonId, () => [...previousTopics])
      if (error instanceof ApiError) {
        alert(error.message)
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent, lessonId: string) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const lesson = lessons.find((item) => item.id === lessonId)
    if (!lesson) return

    const previousTopics = lesson.topics
    const oldIndex = previousTopics.findIndex((topic) => topic.id === String(active.id))
    const newIndex = previousTopics.findIndex((topic) => topic.id === String(over.id))

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedTopics = arrayMove(previousTopics, oldIndex, newIndex).map((topic, index) => ({
      ...topic,
      order: index + 1,
    }))

    updateLessonTopics(lessonId, () => reorderedTopics)

    try {
      await topicsApi.reorder(lessonId, reorderedTopics.map((topic) => topic.id))
    } catch (error) {
      console.error('Failed to update topic order:', error)
      updateLessonTopics(lessonId, () => [...previousTopics])
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ders Yönetimi</h1>
          <p className="mt-2 text-gray-600">Derslerinizi ekleyin, düzenleyin ve yönetin.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Ders Listesi ({lessons.length})</h3>

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
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branş
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
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="mr-2 text-gray-400">＋</span>
                      <input
                        type="text"
                        value={newLessonDraft.name}
                        onChange={(e) => handleNewLessonChange('name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Yeni ders adı"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      value={newLessonDraft.group}
                      onChange={(e) => handleNewLessonChange('group', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Grup"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={newLessonDraft.type}
                      onChange={(e) => handleNewLessonChange('type', e.target.value as 'TYT' | 'AYT')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      value={newLessonDraft.subject}
                      onChange={(e) => handleNewLessonChange('subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Branş (opsiyonel)"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 italic">
                    Oluşturulduğunda atanır
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={handleCreateLesson}
                      disabled={
                        creatingLesson ||
                        !newLessonDraft.name.trim() ||
                        !newLessonDraft.group.trim()
                      }
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                    >
                      {creatingLesson ? 'Ekleniyor...' : 'Ders Ekle'}
                    </button>
                  </td>
                </tr>

                {lessons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      Henüz ders yok. Yukarıdaki satırı kullanarak bir ders ekleyin.
                    </td>
                  </tr>
                ) : (
                  lessons.map((lesson) => {
                    const isEditing = editingLessonId === lesson.id
                    const draft =
                      lessonDrafts[lesson.id] || {
                        name: lesson.name,
                        group: lesson.group,
                        type: lesson.type as 'TYT' | 'AYT',
                        subject: lesson.subject ?? '',
                      }
                    const isUpdating = !!updatingLessonIds[lesson.id]
                    const isDeleting = !!deletingLessonIds[lesson.id]
                    const canSave = draft.name.trim().length > 0 && draft.group.trim().length > 0

                    return (
                      <Fragment key={lesson.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <button
                                onClick={() => toggleLessonExpansion(lesson.id)}
                                className="mr-2 text-gray-400 hover:text-gray-600"
                              >
                                {expandedLessons.has(lesson.id) ? '▼' : '▶'}
                              </button>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={draft.name}
                                  onChange={(e) => handleLessonDraftChange(lesson.id, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                              ) : (
                                lesson.name
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.group}
                                onChange={(e) => handleLessonDraftChange(lesson.id, 'group', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            ) : (
                              lesson.group
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isEditing ? (
                              <select
                                value={draft.type}
                                onChange={(e) =>
                                  handleLessonDraftChange(lesson.id, 'type', e.target.value as 'TYT' | 'AYT')
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="TYT">TYT</option>
                                <option value="AYT">AYT</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  lesson.type === 'TYT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {lesson.type}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.subject}
                                onChange={(e) => handleLessonDraftChange(lesson.id, 'subject', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            ) : lesson.subject ? (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                {lesson.subject}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Belirtilmemiş</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(lesson.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => toggleLessonExpansion(lesson.id)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {expandedLessons.has(lesson.id) ? 'Konuları Gizle' : 'Konuları Göster'}
                              </button>
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleCancelEditLesson(lesson.id)}
                                    className="px-3 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300 text-gray-700"
                                  >
                                    İptal
                                  </button>
                                  <button
                                    onClick={() => handleSaveLesson(lesson.id)}
                                    disabled={isUpdating || !canSave}
                                    className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                  >
                                    {isUpdating ? 'Kaydediliyor...' : 'Kaydet'}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEditLesson(lesson)}
                                    className="px-3 py-1 rounded text-sm bg-blue-500 hover:bg-blue-600 text-white"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    disabled={isDeleting}
                                    className="px-3 py-1 rounded text-sm bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                                  >
                                    {isDeleting ? 'Siliniyor...' : 'Sil'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedLessons.has(lesson.id) && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-4">
                                <div className="bg-white p-4 rounded-lg border">
                                  <h4 className="text-sm font-medium text-gray-900 mb-3">Yeni Konu Ekle</h4>
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <label className="block text-xs font-medium text-gray-700 mb-1">Konu Adı</label>
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

                                {lesson.topics.length > 0 ? (
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
                                        items={lesson.topics.map((topic) => topic.id)}
                                        strategy={verticalListSortingStrategy}
                                      >
                                        <div className="space-y-2">
                                          {lesson.topics.map((topic) => (
                                            <SortableTopicItem
                                              key={topic.id}
                                              topic={topic}
                                              onEdit={handleEditTopic}
                                              onDelete={handleDeleteTopic}
                                            />
                                          ))}
                                        </div>
                                      </SortableContext>
                                    </DndContext>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-sm">Henüz konu eklenmemiş.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingTopic && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Konuyu Düzenle</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Konu Adı</label>
                <input
                  type="text"
                  value={editingTopic.topic.name}
                  onChange={(e) =>
                    setEditingTopic({
                      ...editingTopic,
                      topic: { ...editingTopic.topic, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Konu adını girin"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  onClick={handleUpdateTopic}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Güncelle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
