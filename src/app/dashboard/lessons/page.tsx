'use client'

import { useState, useEffect, Fragment, useMemo } from 'react'
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

type TopicDraft = {
  name: string
  averageTestCount: string
}

const defaultLessonDraft: LessonDraft = {
  name: '',
  group: '',
  type: 'TYT',
  subject: '',
}

const createEmptyTopicDraft = (): TopicDraft => ({
  name: '',
  averageTestCount: '',
})

const normalizeTopic = (topic: Topic): Topic => ({
  ...topic,
  averageTestCount: topic.averageTestCount ?? 0,
})

function normalizeLesson(lesson: Lesson): LessonWithTopics {
  return {
    ...lesson,
    topics: lesson.topics
      ? [...lesson.topics].map((topic) => normalizeTopic(topic)).sort((a, b) => a.order - b.order)
      : [],
  }
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _omitted, ...rest } = record
  return rest
}

function SortableTopicItem({
  topic,
  draft,
  isEditing,
  canSave,
  isSaving,
  isDeleting,
  onChange,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  topic: Topic
  draft: TopicDraft
  isEditing: boolean
  canSave: boolean
  isSaving: boolean
  isDeleting: boolean
  onChange: (field: keyof TopicDraft, value: string) => void
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const averageDisplay = topic.averageTestCount ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-3 rounded border bg-white p-3 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center md:justify-between"
    >
      <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            aria-label="Taşı"
            className="cursor-grab text-gray-400 transition-colors hover:text-gray-600"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
          {isEditing ? (
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onChange('name', e.target.value)}
              placeholder="Konu adı"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <span className="text-sm font-medium text-gray-900">{topic.name}</span>
          )}
        </div>
        <div className="flex items-center gap-3 md:w-56">
          {isEditing ? (
            <input
              type="number"
              min={0}
              value={draft.averageTestCount}
              onChange={(e) => onChange('averageTestCount', e.target.value)}
              placeholder="Ortalama test sayısı"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Ortalama Test: {averageDisplay}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 self-end md:self-auto">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave || isSaving}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
            >
              Düzenle
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs font-semibold text-red-600 transition-colors hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Siliniyor...' : 'Sil'}
            </button>
          </>
        )}
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
  const [topicForms, setTopicForms] = useState<Record<string, TopicDraft>>({})
  const [topicDrafts, setTopicDrafts] = useState<Record<string, TopicDraft>>({})
  const [topicLoading, setTopicLoading] = useState<Record<string, boolean>>({})
  const [savingTopicIds, setSavingTopicIds] = useState<Record<string, boolean>>({})
  const [deletingTopicIds, setDeletingTopicIds] = useState<Record<string, boolean>>({})

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
              topics: updater([...lesson.topics].map(normalizeTopic)).map(normalizeTopic).sort((a, b) => a.order - b.order),
            }
          : lesson
      )
    )
  }

  const handleNewLessonChange = <K extends keyof LessonDraft>(field: K, value: LessonDraft[K]) => {
    setNewLessonDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleLessonDraftChange = <K extends keyof LessonDraft>(lessonId: string, field: K, value: LessonDraft[K]) => {
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
                teacherName: updatedLesson.teacherName ?? lesson.teacherName,
                teacherEmail: updatedLesson.teacherEmail ?? lesson.teacherEmail,
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

  const getTopicForm = (lessonId: string): TopicDraft => topicForms[lessonId] ?? createEmptyTopicDraft()

  const updateTopicForm = (lessonId: string, field: keyof TopicDraft, value: string) => {
    setTopicForms((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] ?? createEmptyTopicDraft()),
        [field]: value,
      },
    }))
  }

  const handleTopicSubmit = async (lessonId: string) => {
    const form = getTopicForm(lessonId)
    if (!form.name.trim()) {
      alert('Konu adı zorunludur!')
      return
    }

    if (form.averageTestCount.trim() === '') {
      alert('Ortalama test sayısı zorunludur!')
      return
    }

    const averageTestCount = Number(form.averageTestCount)
    if (Number.isNaN(averageTestCount) || averageTestCount < 0) {
      alert('Ortalama test sayısı 0 veya daha büyük bir sayı olmalıdır!')
      return
    }

    setTopicLoading((prev) => ({ ...prev, [lessonId]: true }))

    try {
      const newTopic = await topicsApi.create({
        lessonId,
        name: form.name.trim(),
        averageTestCount,
      })

      updateLessonTopics(lessonId, (topics) => [...topics, normalizeTopic(newTopic)])
      setTopicForms((prev) => ({ ...prev, [lessonId]: createEmptyTopicDraft() }))
    } catch (error) {
      console.error('Konu ekleme hatası:', error)
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Konu eklenirken hata oluştu!')
      }
    } finally {
      setTopicLoading((prev) => omitKey(prev, lessonId))
    }
  }

  const handleStartEditTopic = (topic: Topic) => {
    setTopicDrafts((prev) => ({
      ...prev,
      [topic.id]: {
        name: topic.name,
        averageTestCount:
          topic.averageTestCount !== null && topic.averageTestCount !== undefined
            ? String(topic.averageTestCount)
            : '',
      },
    }))
  }

  const handleTopicDraftChange = (topicId: string, field: keyof TopicDraft, value: string) => {
    setTopicDrafts((prev) => ({
      ...prev,
      [topicId]: {
        ...(prev[topicId] ?? createEmptyTopicDraft()),
        [field]: value,
      },
    }))
  }

  const handleCancelEditTopic = (topicId: string) => {
    setTopicDrafts((prev) => omitKey(prev, topicId))
    setSavingTopicIds((prev) => omitKey(prev, topicId))
  }

  const handleSaveTopic = async (topic: Topic, lessonId: string) => {
    const draft = topicDrafts[topic.id]
    if (!draft || !draft.name.trim()) {
      alert('Konu adı zorunludur!')
      return
    }

    const trimmedAverage = draft.averageTestCount.trim()
    const averageTestCount = trimmedAverage === '' ? 0 : Number(trimmedAverage)

    if (Number.isNaN(averageTestCount) || averageTestCount < 0) {
      alert('Ortalama test sayısı 0 veya daha büyük bir sayı olmalıdır!')
      return
    }

    setSavingTopicIds((prev) => ({ ...prev, [topic.id]: true }))

    try {
      const updatedTopic = await topicsApi.update(topic.id, {
        name: draft.name.trim(),
        averageTestCount,
      })

      updateLessonTopics(lessonId, (topics) =>
        topics.map((item) => (item.id === topic.id ? normalizeTopic(updatedTopic) : item))
      )

      setTopicDrafts((prev) => omitKey(prev, topic.id))
    } catch (error) {
      console.error('Error updating topic:', error)
      if (error instanceof ApiError) {
        alert(error.message)
      }
    } finally {
      setSavingTopicIds((prev) => omitKey(prev, topic.id))
    }
  }

  const handleDeleteTopic = async (topicId: string, lessonId: string) => {
    if (!confirm('Bu konuyu silmek istediğinizden emin misiniz?')) return

    const lesson = lessons.find((item) => item.id === lessonId)
    if (!lesson) return

    const previousTopics = lesson.topics

    setDeletingTopicIds((prev) => ({ ...prev, [topicId]: true }))

    const remainingTopics = previousTopics
      .filter((topic) => topic.id !== topicId)
      .map((topic, index) => ({ ...topic, order: index + 1 }))

    updateLessonTopics(lessonId, () => remainingTopics)

    try {
      await topicsApi.delete(topicId)

      setTopicDrafts((prev) => omitKey(prev, topicId))

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
    } finally {
      setDeletingTopicIds((prev) => omitKey(prev, topicId))
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

  const showTeacherInfo = useMemo(
    () => lessons.some((lesson) => lesson.teacherName || lesson.teacherEmail),
    [lessons]
  )

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
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Ders Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Grup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Branş
                  </th>
                  {showTeacherInfo && (
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Öğretmen
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Oluşturulma Tarihi
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">İşlemler</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr className="bg-blue-50/40">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="mr-2 text-gray-400">＋</span>
                      <input
                        type="text"
                        value={newLessonDraft.name}
                        onChange={(e) => handleNewLessonChange('name', e.target.value)}
                        placeholder="Yeni ders adı"
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <input
                      type="text"
                      value={newLessonDraft.group}
                      onChange={(e) => handleNewLessonChange('group', e.target.value)}
                      placeholder="Grup"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <select
                      value={newLessonDraft.type}
                      onChange={(e) => handleNewLessonChange('type', e.target.value as 'TYT' | 'AYT')}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TYT">TYT</option>
                      <option value="AYT">AYT</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <input
                      type="text"
                      value={newLessonDraft.subject}
                      onChange={(e) => handleNewLessonChange('subject', e.target.value)}
                      placeholder="Branş (opsiyonel)"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  {showTeacherInfo && (
                    <td className="px-6 py-4 text-sm text-gray-500">—</td>
                  )}
                  <td className="px-6 py-4 text-sm italic text-gray-400">Oluşturulduğunda atanır</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      type="button"
                      onClick={handleCreateLesson}
                      disabled={
                        creatingLesson ||
                        !newLessonDraft.name.trim() ||
                        !newLessonDraft.group.trim()
                      }
                      className="rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingLesson ? 'Ekleniyor...' : 'Ders Ekle'}
                    </button>
                  </td>
                </tr>

                {lessons.length === 0 ? (
                  <tr>
                    <td colSpan={showTeacherInfo ? 7 : 6} className="px-6 py-8 text-center text-sm text-gray-500">
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
                    const canSaveLesson = draft.name.trim().length > 0 && draft.group.trim().length > 0

                    return (
                      <Fragment key={lesson.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => toggleLessonExpansion(lesson.id)}
                                className="mr-2 text-gray-400 transition-colors hover:text-gray-600"
                              >
                                {expandedLessons.has(lesson.id) ? '▼' : '▶'}
                              </button>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={draft.name}
                                  onChange={(e) => handleLessonDraftChange(lesson.id, 'name', e.target.value)}
                                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                lesson.name
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.group}
                                onChange={(e) => handleLessonDraftChange(lesson.id, 'group', e.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              lesson.group
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <select
                                value={draft.type}
                                onChange={(e) => handleLessonDraftChange(lesson.id, 'type', e.target.value as 'TYT' | 'AYT')}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="TYT">TYT</option>
                                <option value="AYT">AYT</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  lesson.type === 'TYT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {lesson.type}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.subject}
                                onChange={(e) => handleLessonDraftChange(lesson.id, 'subject', e.target.value)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : lesson.subject ? (
                              <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                                {lesson.subject}
                              </span>
                            ) : (
                              <span className="italic text-gray-400">Belirtilmemiş</span>
                            )}
                          </td>
                          {showTeacherInfo && (
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {lesson.teacherName ? (
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-800">{lesson.teacherName}</span>
                                  {lesson.teacherEmail && (
                                    <span className="text-xs text-gray-500">{lesson.teacherEmail}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="italic text-gray-400">Bilgi yok</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(lesson.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => toggleLessonExpansion(lesson.id)}
                                className="text-blue-600 transition-colors hover:text-blue-900"
                              >
                                {expandedLessons.has(lesson.id) ? 'Konuları Gizle' : 'Konuları Göster'}
                              </button>
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEditLesson(lesson.id)}
                                    className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                                  >
                                    İptal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveLesson(lesson.id)}
                                    disabled={isUpdating || !canSaveLesson}
                                    className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdating ? 'Kaydediliyor...' : 'Kaydet'}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditLesson(lesson)}
                                    className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLesson(lesson.id)}
                                    disabled={isDeleting}
                                    className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
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
                            <td colSpan={showTeacherInfo ? 7 : 6} className="bg-gray-50 px-6 py-4">
                              <div className="space-y-4">
                                <div className="rounded-lg border bg-white p-4">
                                  <h4 className="mb-3 text-sm font-medium text-gray-900">Yeni Konu Ekle</h4>
                                  <div className="grid gap-4 md:grid-cols-[2fr,1fr,auto]">
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-700">Konu Adı</label>
                                      <input
                                        type="text"
                                        value={getTopicForm(lesson.id).name}
                                        onChange={(e) => updateTopicForm(lesson.id, 'name', e.target.value)}
                                        placeholder="Örn: Fonksiyonlar, Türev..."
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-medium text-gray-700">Ortalama Test Sayısı</label>
                                      <input
                                        type="number"
                                        min={0}
                                        value={getTopicForm(lesson.id).averageTestCount}
                                        onChange={(e) => updateTopicForm(lesson.id, 'averageTestCount', e.target.value)}
                                        placeholder="Örn: 3"
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div className="flex items-end justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleTopicSubmit(lesson.id)}
                                        disabled={
                                          topicLoading[lesson.id] ||
                                          !getTopicForm(lesson.id).name.trim() ||
                                          getTopicForm(lesson.id).averageTestCount.trim() === ''
                                        }
                                        className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {topicLoading[lesson.id] ? 'Ekleniyor...' : 'Konu Ekle'}
                                      </button>
                                    </div>
                                  </div>
                                  <p className="mt-2 text-xs text-gray-500">Sıralama otomatik olarak atanacak (1, 2, 3...)</p>
                                </div>

                                {lesson.topics.length > 0 ? (
                                  <div className="space-y-2">
                                    <h4 className="text-sm font-medium text-gray-900">
                                      Mevcut Konular
                                      <span className="ml-2 text-xs text-gray-500">(Sürükle-bırak ile sıralayabilirsiniz)</span>
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
                                          {lesson.topics.map((topic) => {
                                            const isEditingTopic = topicDrafts[topic.id] !== undefined
                                            const draft = topicDrafts[topic.id] ?? createEmptyTopicDraft()
                                            const averageDraft = draft.averageTestCount.trim()
                                            const canSaveTopic =
                                              draft.name.trim().length > 0 &&
                                              (averageDraft === '' || (!Number.isNaN(Number(averageDraft)) && Number(averageDraft) >= 0))

                                            return (
                                              <SortableTopicItem
                                                key={topic.id}
                                                topic={topic}
                                                draft={draft}
                                                isEditing={isEditingTopic}
                                                canSave={canSaveTopic}
                                                isSaving={!!savingTopicIds[topic.id]}
                                                isDeleting={!!deletingTopicIds[topic.id]}
                                                onChange={(field, value) => handleTopicDraftChange(topic.id, field, value)}
                                                onEdit={() => handleStartEditTopic(topic)}
                                                onCancel={() => handleCancelEditTopic(topic.id)}
                                                onSave={() => handleSaveTopic(topic, lesson.id)}
                                                onDelete={() => handleDeleteTopic(topic.id, lesson.id)}
                                              />
                                            )
                                          })}
                                        </div>
                                      </SortableContext>
                                    </DndContext>
                                  </div>
                                ) : (
                                  <div className="py-4 text-center text-sm text-gray-500">Henüz konu eklenmemiş.</div>
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
    </div>
  )
}
