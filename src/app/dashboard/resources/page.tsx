'use client'

import { useState, useEffect, Fragment } from 'react'
import { resourcesApi, lessonsApi, ApiError, api } from '@/lib/api'
import { LessonResponse, LessonTopicResponse } from '@/types/api'

type Topic = LessonTopicResponse
type Lesson = LessonResponse & { topics: Topic[] }

interface ResourceTopic {
  id: string
  topic: Topic
  questionCount?: number
}

interface ResourceLesson {
  id: string
  lesson: Lesson
  topics: ResourceTopic[]
}

interface Resource {
  id: string
  name: string
  description: string | null
  lessons: ResourceLesson[]
  createdAt: string
  updatedAt: string
}

type ResourceDraft = {
  name: string
  description: string
  lessonIds: string[]
  topicIds: string[]
  topicQuestionCounts: Record<string, number>
}

const defaultResourceDraft: ResourceDraft = {
  name: '',
  description: '',
  lessonIds: [],
  topicIds: [],
  topicQuestionCounts: {},
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _omitted, ...rest } = record
  return rest
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set())
  const [newResourceDraft, setNewResourceDraft] = useState<ResourceDraft>(defaultResourceDraft)
  const [creatingResource, setCreatingResource] = useState(false)
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null)
  const [resourceDrafts, setResourceDrafts] = useState<Record<string, ResourceDraft>>({})
  const [updatingResourceIds, setUpdatingResourceIds] = useState<Record<string, boolean>>({})
  const [deletingResourceIds, setDeletingResourceIds] = useState<Record<string, boolean>>({})
  const [expandedLessons, setExpandedLessons] = useState<Record<string, Set<string>>>({})
  const [expandedGroups, setExpandedGroups] = useState<Record<string, Set<string>>>({})
  const [bulkQuestionCount, setBulkQuestionCount] = useState<Record<string, string>>({})

  const fetchResources = async () => {
    try {
      const response = await resourcesApi.getAll()
      // API returns SuccessResponse<{ data: resources, pagination }>
      // So response.data = { data: resources, pagination }
      const resourcesData = (response.data as any)?.data || (Array.isArray(response.data) ? response.data : [])
      setResources(resourcesData)
    } catch (error) {
      console.error('Resources fetch error:', error)
      if (error instanceof ApiError) {
        alert(`Kaynaklar yüklenirken hata oluştu: ${error.message}`)
      }
      setResources([])
    }
  }

  const fetchLessons = async () => {
    try {
      const response = await lessonsApi.getAll()
      const lessonsData = Array.isArray(response.data) ? response.data : []
      const normalized = lessonsData.map((lesson) => ({
        ...lesson,
        group: lesson.group || 'Diğer',
        topics: lesson.topics || [],
      }))
      setLessons(normalized)
    } catch (error) {
      console.error('Lessons fetch error:', error)
      if (error instanceof ApiError) {
        alert(`Dersler yüklenirken hata oluştu: ${error.message}`)
      }
      setLessons([])
    }
  }

  useEffect(() => {
    fetchResources()
    fetchLessons()
  }, [])

  const toggleResourceExpansion = (resourceId: string) => {
    setExpandedResources((prev) => {
      const updated = new Set(prev)
      if (updated.has(resourceId)) {
        updated.delete(resourceId)
      } else {
        updated.add(resourceId)
      }
      return updated
    })
  }

  const handleNewResourceChange = <K extends keyof ResourceDraft>(field: K, value: ResourceDraft[K]) => {
    setNewResourceDraft((prev) => ({ ...prev, [field]: value }))
  }

  const resourceEnterHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleCreateResource()
    }
  }

  const handleResourceDraftChange = <K extends keyof ResourceDraft>(resourceId: string, field: K, value: ResourceDraft[K]) => {
    setResourceDrafts((prev) => ({
      ...prev,
      [resourceId]: {
        ...(prev[resourceId] || defaultResourceDraft),
        [field]: value,
      },
    }))
  }

  const resourceEditEnterHandler = (resourceId: string) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveResource(resourceId)
    }
  }

  const handleStartEditResource = (resource: Resource) => {
    setEditingResourceId(resource.id)
    setResourceDrafts((prev) => ({
      ...prev,
      [resource.id]: {
        name: resource.name || '',
        description: resource.description || '',
        lessonIds: resource.lessons?.map((rl) => rl.lesson?.id).filter(Boolean) || [],
        topicIds: resource.lessons?.flatMap((rl) => rl.topics?.map((rt) => rt.topic?.id).filter(Boolean) || []) || [],
        topicQuestionCounts: resource.lessons?.reduce((acc, rl) => {
          rl.topics?.forEach((rt) => {
            if (rt.topic?.id) {
              acc[rt.topic.id] = rt.questionCount || 0
            }
          })
          return acc
        }, {} as Record<string, number>) || {},
      },
    }))
  }

  const handleCancelEditResource = (resourceId: string) => {
    setResourceDrafts((prev) => omitKey(prev, resourceId))
    setEditingResourceId((current) => (current === resourceId ? null : current))
  }

  const handleCreateResource = async () => {
    if (!newResourceDraft.name || !newResourceDraft.name.trim()) {
      alert('Kitap adı zorunludur!')
      return
    }

    setCreatingResource(true)

    try {
      // API expects: { name, description, lessonIds, topicIds, topicQuestionCounts }
      const response = await api.post('/api/resources', {
        name: (newResourceDraft.name || '').trim(),
        description: newResourceDraft.description && typeof newResourceDraft.description === 'string' && newResourceDraft.description.trim() !== ''
          ? newResourceDraft.description.trim()
          : null,
        lessonIds: newResourceDraft.lessonIds,
        topicIds: newResourceDraft.topicIds,
        topicQuestionCounts: newResourceDraft.topicQuestionCounts,
      })

      // Response might be wrapped in SuccessResponse
      const createdResource = (response as any).data || response
      setResources((prev) => [createdResource as Resource, ...prev])
      setNewResourceDraft(defaultResourceDraft)
    } catch (error) {
      console.error('Resource creation error:', error)
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Kaynak eklenirken hata oluştu!')
      }
    } finally {
      setCreatingResource(false)
    }
  }

  const handleSaveResource = async (resourceId: string) => {
    const draft = resourceDrafts[resourceId]
    if (!draft || !draft.name || !draft.name.trim()) {
      alert('Kitap adı zorunludur!')
      return
    }

    setUpdatingResourceIds((prev) => ({ ...prev, [resourceId]: true }))
    const resourceSnapshot = resources.find((r) => r.id === resourceId)

    try {
      const response = await api.put(`/api/resources/${resourceId}`, {
        name: (draft.name || '').trim(),
        description: draft.description && typeof draft.description === 'string' && draft.description.trim() !== ''
          ? draft.description.trim()
          : null,
        lessonIds: draft.lessonIds,
        topicIds: draft.topicIds,
        topicQuestionCounts: draft.topicQuestionCounts,
      })

      // Response might be wrapped in SuccessResponse
      const updatedResource = (response as any).data || response

      setResources((prev) =>
        prev.map((resource) =>
          resource.id === resourceId
            ? (updatedResource as Resource)
            : resource
        )
      )

      setResourceDrafts((prev) => omitKey(prev, resourceId))
      setEditingResourceId((current) => (current === resourceId ? null : current))
    } catch (error) {
      console.error('Error updating resource:', error)
      if (resourceSnapshot) {
        setResources((prev) =>
          prev.map((resource) => (resource.id === resourceId ? resourceSnapshot : resource))
        )
      }
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Kaynak güncellenirken hata oluştu!')
      }
    } finally {
      setUpdatingResourceIds((prev) => omitKey(prev, resourceId))
    }
  }

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Bu kaynağı silmek istediğinizden emin misiniz?')) return

    setDeletingResourceIds((prev) => ({ ...prev, [resourceId]: true }))
    const resourceSnapshot = resources

    setResources((prev) => prev.filter((resource) => resource.id !== resourceId))

    try {
      await resourcesApi.delete(resourceId)
      setExpandedResources((prev) => {
        const updated = new Set(prev)
        updated.delete(resourceId)
        return updated
      })
      setResourceDrafts((prev) => omitKey(prev, resourceId))
      setEditingResourceId((current) => (current === resourceId ? null : current))
    } catch (error) {
      console.error('Error deleting resource:', error)
      setResources(() => [...resourceSnapshot])
      if (error instanceof ApiError) {
        alert(error.message)
      } else {
        alert('Kaynak silinirken hata oluştu!')
      }
    } finally {
      setDeletingResourceIds((prev) => omitKey(prev, resourceId))
    }
  }

  const handleLessonToggle = (lessonId: string, resourceId: 'new' | string) => {
    if (resourceId === 'new') {
      setNewResourceDraft((prev) => {
        const isSelected = prev.lessonIds.includes(lessonId)
        const newLessonIds = isSelected
          ? prev.lessonIds.filter((id) => id !== lessonId)
          : [...prev.lessonIds, lessonId]

        const newTopicIds = isSelected
          ? prev.topicIds.filter((topicId) => {
              const lesson = lessons.find((l) => l.id === lessonId)
              return lesson ? !lesson.topics.some((t) => t.id === topicId) : true
            })
          : prev.topicIds

        return {
          ...prev,
          lessonIds: newLessonIds,
          topicIds: newTopicIds,
        }
      })
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        const isSelected = draft.lessonIds.includes(lessonId)
        const newLessonIds = isSelected
          ? draft.lessonIds.filter((id) => id !== lessonId)
          : [...draft.lessonIds, lessonId]

        const newTopicIds = isSelected
          ? draft.topicIds.filter((topicId) => {
              const lesson = lessons.find((l) => l.id === lessonId)
              return lesson ? !lesson.topics.some((t) => t.id === topicId) : true
            })
          : draft.topicIds

        return {
          ...prev,
          [resourceId]: {
            ...draft,
            lessonIds: newLessonIds,
            topicIds: newTopicIds,
          },
        }
      })
    }
  }

  const handleTopicToggle = (topicId: string, lessonId: string, resourceId: 'new' | string) => {
    if (resourceId === 'new') {
      setNewResourceDraft((prev) => {
        const isSelected = prev.topicIds.includes(topicId)
        const newTopicIds = isSelected
          ? prev.topicIds.filter((id) => id !== topicId)
          : [...prev.topicIds, topicId]

        const newLessonIds = !isSelected && !prev.lessonIds.includes(lessonId)
          ? [...prev.lessonIds, lessonId]
          : prev.lessonIds

        return {
          ...prev,
          lessonIds: newLessonIds,
          topicIds: newTopicIds,
        }
      })
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        const isSelected = draft.topicIds.includes(topicId)
        const newTopicIds = isSelected
          ? draft.topicIds.filter((id) => id !== topicId)
          : [...draft.topicIds, topicId]

        const newLessonIds = !isSelected && !draft.lessonIds.includes(lessonId)
          ? [...draft.lessonIds, lessonId]
          : draft.lessonIds

        return {
          ...prev,
          [resourceId]: {
            ...draft,
            lessonIds: newLessonIds,
            topicIds: newTopicIds,
          },
        }
      })
    }
  }

  const toggleGroupExpansion = (group: string, resourceId: 'new' | string) => {
    const key = resourceId === 'new' ? 'new' : resourceId
    setExpandedGroups((prev) => {
      const current = prev[key] || new Set<string>()
      const updated = new Set(current)
      if (updated.has(group)) {
        updated.delete(group)
      } else {
        updated.add(group)
      }
      return { ...prev, [key]: updated }
    })
  }

  const toggleLessonExpansion = (lessonId: string, resourceId: 'new' | string) => {
    const key = resourceId === 'new' ? 'new' : resourceId
    setExpandedLessons((prev) => {
      const current = prev[key] || new Set<string>()
      const updated = new Set(current)
      if (updated.has(lessonId)) {
        updated.delete(lessonId)
      } else {
        updated.add(lessonId)
      }
      return { ...prev, [key]: updated }
    })
  }

  const isGroupExpanded = (group: string, resourceId: 'new' | string) => {
    const key = resourceId === 'new' ? 'new' : resourceId
    return expandedGroups[key]?.has(group) ?? true // Default to expanded
  }

  const isLessonExpanded = (lessonId: string, resourceId: 'new' | string) => {
    const key = resourceId === 'new' ? 'new' : resourceId
    return expandedLessons[key]?.has(lessonId) ?? false // Default to collapsed
  }

  const handleQuestionCountChange = (topicId: string, value: string, resourceId: 'new' | string) => {
    const count = Math.max(0, parseInt(value) || 0)

    if (resourceId === 'new') {
      setNewResourceDraft((prev) => ({
        ...prev,
        topicQuestionCounts: {
          ...prev.topicQuestionCounts,
          [topicId]: count,
        },
      }))
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        return {
          ...prev,
          [resourceId]: {
            ...draft,
            topicQuestionCounts: {
              ...draft.topicQuestionCounts,
              [topicId]: count,
            },
          },
        }
      })
    }
  }

  const handleBulkQuestionCountApply = (resourceId: 'new' | string, scope: 'all' | 'selected' | 'group' | 'lesson', groupOrLessonId?: string) => {
    const key = resourceId === 'new' ? 'new' : resourceId
    const countValue = bulkQuestionCount[key] || '0'
    const count = Math.max(0, parseInt(countValue) || 0)

    let targetTopicIds: string[] = []

    if (scope === 'all') {
      targetTopicIds = lessons.flatMap((lesson) => (lesson.topics || []).map((topic) => topic.id).filter(Boolean))
    } else if (scope === 'selected') {
      const draft = resourceId === 'new' ? newResourceDraft : resourceDrafts[resourceId] || defaultResourceDraft
      targetTopicIds = draft.topicIds
    } else if (scope === 'group' && groupOrLessonId) {
      const groupLessons = lessons.filter((lesson) => (lesson.group || 'Diğer') === groupOrLessonId)
      targetTopicIds = groupLessons.flatMap((lesson) => (lesson.topics || []).map((topic) => topic.id).filter(Boolean))
    } else if (scope === 'lesson' && groupOrLessonId) {
      const lesson = lessons.find((l) => l.id === groupOrLessonId)
      if (lesson) {
        const draft = resourceId === 'new' ? newResourceDraft : resourceDrafts[resourceId] || defaultResourceDraft
        const lessonTopicIds = (lesson.topics || []).map((topic) => topic.id).filter(Boolean)
        // Only apply to selected topics in this lesson
        targetTopicIds = lessonTopicIds.filter((topicId) => draft.topicIds.includes(topicId))
      }
    }

    if (targetTopicIds.length === 0) {
      alert('Uygulanacak konu bulunamadı!')
      return
    }

    if (resourceId === 'new') {
      setNewResourceDraft((prev) => {
        const updatedCounts = { ...prev.topicQuestionCounts }
        targetTopicIds.forEach((topicId) => {
          updatedCounts[topicId] = count
        })
        return {
          ...prev,
          topicQuestionCounts: updatedCounts,
        }
      })
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        const updatedCounts = { ...draft.topicQuestionCounts }
        targetTopicIds.forEach((topicId) => {
          updatedCounts[topicId] = count
        })
        return {
          ...prev,
          [resourceId]: {
            ...draft,
            topicQuestionCounts: updatedCounts,
          },
        }
      })
    }

    // Clear bulk input after applying
    setBulkQuestionCount((prev) => ({ ...prev, [key]: '' }))
  }

  const handleSelectAll = (resourceId: 'new' | string) => {
    if (resourceId === 'new') {
      setNewResourceDraft((prev) => ({
        ...prev,
        lessonIds: lessons.map((lesson) => lesson.id).filter(Boolean),
        topicIds: lessons.flatMap((lesson) => (lesson.topics || []).map((topic) => topic.id).filter(Boolean)),
      }))
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        return {
          ...prev,
          [resourceId]: {
            ...draft,
            lessonIds: lessons.map((lesson) => lesson.id).filter(Boolean),
            topicIds: lessons.flatMap((lesson) => (lesson.topics || []).map((topic) => topic.id).filter(Boolean)),
          },
        }
      })
    }
  }

  const handleSelectNone = (resourceId: 'new' | string) => {
    if (resourceId === 'new') {
      setNewResourceDraft((prev) => ({
        ...prev,
        lessonIds: [],
        topicIds: [],
        topicQuestionCounts: {},
      }))
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        return {
          ...prev,
          [resourceId]: {
            ...draft,
            lessonIds: [],
            topicIds: [],
            topicQuestionCounts: {},
          },
        }
      })
    }
  }

  const handleGroupToggle = (group: string, resourceId: 'new' | string) => {
    const groupLessons = lessons.filter((lesson) => (lesson.group || 'Diğer') === group)
    const groupLessonIds = groupLessons.map((lesson) => lesson.id).filter(Boolean)
    const groupTopicIds = groupLessons.flatMap((lesson) => (lesson.topics || []).map((topic) => topic.id).filter(Boolean))

    if (resourceId === 'new') {
      setNewResourceDraft((prev) => {
        const isGroupSelected = groupLessonIds.every((lessonId) => prev.lessonIds.includes(lessonId))
        if (isGroupSelected) {
          return {
            ...prev,
            lessonIds: prev.lessonIds.filter((id) => !groupLessonIds.includes(id)),
            topicIds: prev.topicIds.filter((id) => !groupTopicIds.includes(id)),
          }
        } else {
          return {
            ...prev,
            lessonIds: [...new Set([...prev.lessonIds, ...groupLessonIds])],
            topicIds: [...new Set([...prev.topicIds, ...groupTopicIds])],
          }
        }
      })
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        const isGroupSelected = groupLessonIds.every((lessonId) => draft.lessonIds.includes(lessonId))
        if (isGroupSelected) {
          return {
            ...prev,
            [resourceId]: {
              ...draft,
              lessonIds: draft.lessonIds.filter((id) => !groupLessonIds.includes(id)),
              topicIds: draft.topicIds.filter((id) => !groupTopicIds.includes(id)),
            },
          }
        } else {
          return {
            ...prev,
            [resourceId]: {
              ...draft,
              lessonIds: [...new Set([...draft.lessonIds, ...groupLessonIds])],
              topicIds: [...new Set([...draft.topicIds, ...groupTopicIds])],
            },
          }
        }
      })
    }
  }

  const handleLessonSelectAll = (lessonId: string, resourceId: 'new' | string) => {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) return

    const lessonTopicIds = (lesson.topics || []).map((topic) => topic.id).filter(Boolean)

    if (resourceId === 'new') {
      setNewResourceDraft((prev) => ({
        ...prev,
        lessonIds: prev.lessonIds.includes(lessonId) ? prev.lessonIds : [...prev.lessonIds, lessonId],
        topicIds: [...new Set([...prev.topicIds, ...lessonTopicIds])],
      }))
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        return {
          ...prev,
          [resourceId]: {
            ...draft,
            lessonIds: draft.lessonIds.includes(lessonId) ? draft.lessonIds : [...draft.lessonIds, lessonId],
            topicIds: [...new Set([...draft.topicIds, ...lessonTopicIds])],
          },
        }
      })
    }
  }

  const handleLessonSelectNone = (lessonId: string, resourceId: 'new' | string) => {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) return

    const lessonTopicIds = (lesson.topics || []).map((topic) => topic.id).filter(Boolean)

    if (resourceId === 'new') {
      setNewResourceDraft((prev) => ({
        ...prev,
        lessonIds: prev.lessonIds.filter((id) => id !== lessonId),
        topicIds: prev.topicIds.filter((id) => !lessonTopicIds.includes(id)),
        topicQuestionCounts: Object.fromEntries(
          Object.entries(prev.topicQuestionCounts).filter(([topicId]) => !lessonTopicIds.includes(topicId))
        ),
      }))
    } else {
      setResourceDrafts((prev) => {
        const draft = prev[resourceId] || defaultResourceDraft
        return {
          ...prev,
          [resourceId]: {
            ...draft,
            lessonIds: draft.lessonIds.filter((id) => id !== lessonId),
            topicIds: draft.topicIds.filter((id) => !lessonTopicIds.includes(id)),
            topicQuestionCounts: Object.fromEntries(
              Object.entries(draft.topicQuestionCounts).filter(([topicId]) => !lessonTopicIds.includes(topicId))
            ),
          },
        }
      })
    }
  }

  const isGroupSelected = (group: string, resourceId: 'new' | string) => {
    const groupLessons = lessons.filter((lesson) => (lesson.group || 'Diğer') === group)
    const draft =
      resourceId === 'new'
        ? newResourceDraft
        : resourceDrafts[resourceId] || defaultResourceDraft
    return groupLessons.length > 0 && groupLessons.every((lesson) => draft.lessonIds.includes(lesson.id))
  }

  const isGroupPartiallySelected = (group: string, resourceId: 'new' | string) => {
    const groupLessons = lessons.filter((lesson) => (lesson.group || 'Diğer') === group)
    const draft =
      resourceId === 'new'
        ? newResourceDraft
        : resourceDrafts[resourceId] || defaultResourceDraft
    const selectedCount = groupLessons.filter((lesson) => draft.lessonIds.includes(lesson.id)).length
    return selectedCount > 0 && selectedCount < groupLessons.length
  }

  const groupedLessons = lessons.reduce((acc, lesson) => {
    // Handle undefined/null group values
    const group = lesson.group || 'Diğer'
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(lesson)
    return acc
  }, {} as Record<string, Lesson[]>)

  const renderLessonTopicSelection = (resourceId: 'new' | string) => {
    const draft = resourceId === 'new' ? newResourceDraft : resourceDrafts[resourceId] || defaultResourceDraft
    const key = resourceId === 'new' ? 'new' : resourceId

    return (
      <div className="border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">İlişkili Dersler</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(resourceId)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Tümünü Seç
            </button>
            <button
              type="button"
              onClick={() => handleSelectNone(resourceId)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Hiçbirini Seçme
            </button>
          </div>
        </div>

        {/* Bulk Question Count Assignment */}
        <div className="sticky top-0 z-10 mb-4 p-3 bg-blue-50 rounded-md border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium text-gray-700">Toplu Soru Sayısı:</label>
            <input
              type="number"
              min="0"
              value={bulkQuestionCount[key] || ''}
              onChange={(e) => setBulkQuestionCount((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder="Soru sayısı"
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            />
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleBulkQuestionCountApply(resourceId, 'selected')}
                disabled={!bulkQuestionCount[key] || draft.topicIds.length === 0}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Seçili Konulara Uygula
              </button>
              <button
                type="button"
                onClick={() => handleBulkQuestionCountApply(resourceId, 'all')}
                disabled={!bulkQuestionCount[key]}
                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tüm Konulara Uygula
              </button>
            </div>
          </div>
        </div>

        {Object.entries(groupedLessons).map(([group, groupLessons]) => {
          const groupExpanded = isGroupExpanded(group, resourceId)
          return (
            <div key={group || 'undefined'} className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
              {/* Branş Accordion Header */}
              <button
                type="button"
                onClick={() => toggleGroupExpansion(group, resourceId)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                aria-expanded={groupExpanded}
              >
                <div className="flex items-center flex-1">
                  <svg
                    className={`w-5 h-5 mr-3 text-gray-600 transition-transform ${groupExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <label
                    className="flex items-center flex-1 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isGroupSelected(group, resourceId)}
                      ref={(input) => {
                        if (input) input.indeterminate = isGroupPartiallySelected(group, resourceId)
                      }}
                      onChange={() => handleGroupToggle(group, resourceId)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">{group || 'Diğer'}</span>
                    <span className="ml-2 text-xs text-gray-500">({groupLessons.length} ders)</span>
                  </label>
                </div>
                {groupExpanded && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleBulkQuestionCountApply(resourceId, 'group', group)
                    }}
                    disabled={!bulkQuestionCount[key]}
                    className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Grubun tüm konularına soru sayısı uygula"
                  >
                    Gruba Uygula
                  </button>
                )}
              </button>
              
              {/* Branş Accordion Content */}
              {groupExpanded && (
                <div className="p-3 bg-white border-t border-gray-200">
                  <div className="space-y-2">
                    {groupLessons.map((lesson) => {
                      const lessonExpanded = isLessonExpanded(lesson.id, resourceId)
                      const lessonTopics = lesson.topics || []
                      const selectedTopicsInLesson = lessonTopics.filter((topic) => draft.topicIds.includes(topic.id))
                      return (
                        <div key={lesson.id} className="border border-gray-200 rounded-md overflow-hidden">
                          {/* Lesson Accordion Header */}
                          <button
                            type="button"
                            onClick={() => toggleLessonExpansion(lesson.id, resourceId)}
                            disabled={lessonTopics.length === 0}
                            className={`w-full flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 transition-colors ${lessonTopics.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-expanded={lessonExpanded}
                          >
                            <div className="flex items-center flex-1">
                              <svg
                                className={`w-4 h-4 mr-2 text-gray-600 transition-transform ${lessonExpanded ? 'rotate-90' : ''} ${lessonTopics.length === 0 ? 'opacity-30' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <label
                                className="flex items-center flex-1 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={draft.lessonIds.includes(lesson.id)}
                                  onChange={() => handleLessonToggle(lesson.id, resourceId)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-900">{lesson.name}</span>
                                {lessonTopics.length > 0 && (
                                  <span className="ml-2 text-xs text-gray-500">({lessonTopics.length} konu)</span>
                                )}
                              </label>
                            </div>
                            {lessonTopics.length > 0 && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleLessonSelectAll(lesson.id, resourceId)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                >
                                  Tümünü Seç
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLessonSelectNone(lesson.id, resourceId)}
                                  className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
                                >
                                  Hiçbirini Seçme
                                </button>
                              </div>
                            )}
                          </button>
                          
                          {/* Lesson Accordion Content */}
                          {lessonExpanded && lessonTopics.length > 0 && (
                            <div className="p-3 bg-white border-t border-gray-200">
                              <div className="flex justify-end mb-2">
                                {selectedTopicsInLesson.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleBulkQuestionCountApply(resourceId, 'lesson', lesson.id)}
                                    disabled={!bulkQuestionCount[key]}
                                    className="text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Dersin seçili konularına soru sayısı uygula"
                                  >
                                    Derse Uygula
                                  </button>
                                )}
                              </div>
                              <div className="space-y-1">
                                {lessonTopics.map((topic) => (
                                  <div key={topic.id} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded">
                                    <label className="flex items-center flex-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={draft.topicIds.includes(topic.id)}
                                        onChange={() => handleTopicToggle(topic.id, lesson.id, resourceId)}
                                        disabled={!draft.lessonIds.includes(lesson.id)}
                                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                      <span className="ml-2 text-xs text-gray-600">
                                        {topic.order || ''}. {topic.name || ''}
                                      </span>
                                    </label>
                                    {draft.topicIds.includes(topic.id) && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="0"
                                          value={draft.topicQuestionCounts[topic.id] || ''}
                                          onChange={(e) => handleQuestionCountChange(topic.id, e.target.value, resourceId)}
                                          className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                                          placeholder="0"
                                        />
                                        <span className="text-xs text-gray-500">soru</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kaynak Yönetimi</h1>
        <p className="mt-2 text-gray-600">Kitaplarınızı ekleyin, düzenleyin ve derslerle ilişkilendirin.</p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Kaynak Listesi ({resources.length})
          </h3>

          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Kitap Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    İlişkili Dersler
                  </th>
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
                        value={newResourceDraft.name}
                        onChange={(e) => handleNewResourceChange('name', e.target.value)}
                        placeholder="Yeni kaynak adı"
                        onKeyDown={resourceEnterHandler}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <input
                      type="text"
                      value={newResourceDraft.description}
                      onChange={(e) => handleNewResourceChange('description', e.target.value)}
                      placeholder="Açıklama (opsiyonel)"
                      onKeyDown={resourceEnterHandler}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm italic text-gray-400">Oluşturulduğunda atanır</td>
                  <td className="px-6 py-4 text-sm italic text-gray-400">Oluşturulduğunda atanır</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      type="button"
                      onClick={handleCreateResource}
                      disabled={creatingResource || !newResourceDraft.name || !newResourceDraft.name.trim()}
                      className="rounded bg-green-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingResource ? 'Ekleniyor...' : 'Kaynak Ekle'}
                    </button>
                  </td>
                </tr>

                {resources.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                      Henüz kaynak yok. Yukarıdaki satırı kullanarak bir kaynak ekleyin.
                    </td>
                  </tr>
                ) : (
                  resources.map((resource) => {
                    const isEditing = editingResourceId === resource.id
                    const draft = resourceDrafts[resource.id] || {
                      name: resource.name || '',
                      description: resource.description || '',
                      lessonIds: resource.lessons?.map((rl) => rl.lesson?.id).filter(Boolean) || [],
                      topicIds: resource.lessons?.flatMap((rl) => rl.topics?.map((rt) => rt.topic?.id).filter(Boolean) || []) || [],
                      topicQuestionCounts: resource.lessons?.reduce((acc, rl) => {
                        rl.topics?.forEach((rt) => {
                          if (rt.topic?.id) {
                            acc[rt.topic.id] = rt.questionCount || 0
                          }
                        })
                        return acc
                      }, {} as Record<string, number>) || {},
                    }
                    const isUpdating = !!updatingResourceIds[resource.id]
                    const isDeleting = !!deletingResourceIds[resource.id]
                    const canSaveResource = draft.name && draft.name.trim().length > 0

                    return (
                      <Fragment key={resource.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => toggleResourceExpansion(resource.id)}
                                className="mr-2 text-gray-400 transition-transform hover:text-gray-600"
                                aria-label={expandedResources.has(resource.id) ? 'Detayları Gizle' : 'Detayları Göster'}
                              >
                                <svg
                                  className={`w-5 h-5 transition-transform ${expandedResources.has(resource.id) ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={draft.name}
                                  onChange={(e) => handleResourceDraftChange(resource.id, 'name', e.target.value)}
                                  onKeyDown={resourceEditEnterHandler(resource.id)}
                                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                resource.name || ''
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {isEditing ? (
                              <input
                                type="text"
                                value={draft.description}
                                onChange={(e) => handleResourceDraftChange(resource.id, 'description', e.target.value)}
                                onKeyDown={resourceEditEnterHandler(resource.id)}
                                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              resource.description || '-'
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {resource.lessons.length} ders
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(resource.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelEditResource(resource.id)}
                                    className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                                  >
                                    İptal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveResource(resource.id)}
                                    disabled={isUpdating || !canSaveResource}
                                    className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isUpdating ? 'Kaydediliyor...' : 'Kaydet'}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditResource(resource)}
                                    className="rounded bg-blue-500 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteResource(resource.id)}
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
                        {expandedResources.has(resource.id) && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-4">
                                {isEditing ? (
                                  <div className="bg-white p-4 rounded-lg border">
                                    <h4 className="text-sm font-medium text-gray-900 mb-3">Ders ve Konu Seçimi</h4>
                                    {renderLessonTopicSelection(resource.id)}
                                  </div>
                                ) : (
                                  <>
                                    <div className="bg-white p-4 rounded-lg border">
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">Kaynak Detayları</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Kitap Adı
                                          </label>
                                          <p className="text-sm text-gray-900">{resource.name || ''}</p>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Açıklama
                                          </label>
                                          <p className="text-sm text-gray-900">{resource.description || 'Açıklama yok'}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border">
                                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                                        İlişkili Dersler ve Konular ({resource.lessons.length})
                                      </h4>
                                      {resource.lessons.length > 0 ? (
                                        <div className="space-y-4">
                                          {resource.lessons.map((rl) => (
                                            <div key={rl.id} className="border border-gray-200 rounded-lg p-3">
                                              <div className="flex items-center mb-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                  {rl.lesson.name}
                                                </span>
                                                <span className="ml-2 text-xs text-gray-500">
                                                  {rl.lesson.group || 'Diğer'} - {rl.lesson.type || ''}
                                                </span>
                                              </div>
                                              {rl.topics && rl.topics.length > 0 && (
                                                <div className="ml-2">
                                                  <h5 className="text-xs font-medium text-gray-700 mb-2">
                                                    Konular ({rl.topics.length})
                                                  </h5>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {rl.topics.map((rt) => (
                                                      <div
                                                        key={rt.id}
                                                        className="flex items-center justify-between bg-green-50 p-2 rounded border"
                                                      >
                                                        <span className="text-xs text-green-800">{rt.topic?.name || ''}</span>
                                                        {rt.questionCount && rt.questionCount > 0 && (
                                                          <span className="text-xs font-medium text-blue-600">
                                                            {rt.questionCount} soru
                                                          </span>
                                                        )}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                          Bu kaynak henüz hiçbir dersle ilişkilendirilmemiş.
                                        </div>
                                      )}
                                    </div>
                                  </>
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
