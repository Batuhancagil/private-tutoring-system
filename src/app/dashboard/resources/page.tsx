'use client'

import { useState, useEffect } from 'react'

interface Topic {
  id: string
  name: string
  order: number
  lessonId: string
}

interface Lesson {
  id: string
  name: string
  group: string
  topics: Topic[]
}

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

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    lessonIds: [] as string[],
    topicIds: [] as string[],
    topicQuestionCounts: {} as Record<string, number>
  })
  const [loading, setLoading] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [editingQuestionCount, setEditingQuestionCount] = useState<{
    topicId: string
    value: string
  } | null>(null)

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources')
      const data = await response.json()
      setResources(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Resources fetch error:', error)
      setResources([])
    }
  }

  const fetchLessons = async () => {
    try {
      const response = await fetch('/api/lessons')
      const data = await response.json()
      setLessons(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Lessons fetch error:', error)
      setLessons([])
    }
  }

  useEffect(() => {
    fetchResources()
    fetchLessons()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Kitap adı zorunludur!')
      return
    }

    setLoading(true)
    try {
      const url = editingResource ? `/api/resources/${editingResource.id}` : '/api/resources'
      const method = editingResource ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setFormData({ name: '', description: '', lessonIds: [], topicIds: [], topicQuestionCounts: {} })
        setEditingResource(null)
        fetchResources()
        alert(editingResource ? 'Kaynak güncellendi!' : 'Kaynak oluşturuldu!')
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        alert(error.error || 'Kaynak işlemi sırasında hata oluştu!')
      }
    } catch (error) {
      alert('Kaynak işlemi sırasında hata oluştu!')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      name: resource.name,
      description: resource.description || '',
      lessonIds: resource.lessons.map(rl => rl.lesson.id),
      topicIds: resource.lessons.flatMap(rl => rl.topics.map(rt => rt.topic.id)),
      topicQuestionCounts: resource.lessons.reduce((acc, rl) => {
        rl.topics.forEach(rt => {
          acc[rt.topic.id] = rt.questionCount || 0
        })
        return acc
      }, {} as Record<string, number>)
    })
  }

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Bu kaynağı silmek istediğinizden emin misiniz?')) return

    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchResources()
      } else {
        console.error('Failed to delete resource')
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
    }
  }

  const handleLessonToggle = (lessonId: string) => {
    setFormData(prev => {
      const isSelected = prev.lessonIds.includes(lessonId)
      const newLessonIds = isSelected
        ? prev.lessonIds.filter(id => id !== lessonId)
        : [...prev.lessonIds, lessonId]
      
      // Eğer ders seçimi kaldırılıyorsa, o derse ait konuları da kaldır
      const newTopicIds = isSelected
        ? prev.topicIds.filter(topicId => {
            const lesson = lessons.find(l => l.id === lessonId)
            return lesson ? !lesson.topics.some(t => t.id === topicId) : true
          })
        : prev.topicIds
      
      return {
        ...prev,
        lessonIds: newLessonIds,
        topicIds: newTopicIds
      }
    })
  }

  const handleTopicToggle = (topicId: string, lessonId: string) => {
    setFormData(prev => {
      const isSelected = prev.topicIds.includes(topicId)
      const newTopicIds = isSelected
        ? prev.topicIds.filter(id => id !== topicId)
        : [...prev.topicIds, topicId]
      
      // Eğer konu seçiliyorsa, ders de seçili olmalı
      const newLessonIds = !isSelected && !prev.lessonIds.includes(lessonId)
        ? [...prev.lessonIds, lessonId]
        : prev.lessonIds
      
      return {
        ...prev,
        lessonIds: newLessonIds,
        topicIds: newTopicIds
      }
    })
  }

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      lessonIds: lessons.map(lesson => lesson.id),
      topicIds: lessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    }))
  }

  const handleSelectNone = () => {
    setFormData(prev => ({
      ...prev,
      lessonIds: [],
      topicIds: []
    }))
  }

  const handleGroupToggle = (group: string) => {
    const groupLessons = lessons.filter(lesson => lesson.group === group)
    const groupLessonIds = groupLessons.map(lesson => lesson.id)
    const groupTopicIds = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    
    setFormData(prev => {
      const isGroupSelected = groupLessonIds.every(lessonId => prev.lessonIds.includes(lessonId))
      
      if (isGroupSelected) {
        // Grubu kaldır
        return {
          ...prev,
          lessonIds: prev.lessonIds.filter(id => !groupLessonIds.includes(id)),
          topicIds: prev.topicIds.filter(id => !groupTopicIds.includes(id))
        }
      } else {
        // Grubu seç
        return {
          ...prev,
          lessonIds: [...new Set([...prev.lessonIds, ...groupLessonIds])],
          topicIds: [...new Set([...prev.topicIds, ...groupTopicIds])]
        }
      }
    })
  }

  const handleGroupSelectAll = (group: string) => {
    const groupLessons = lessons.filter(lesson => lesson.group === group)
    const groupLessonIds = groupLessons.map(lesson => lesson.id)
    const groupTopicIds = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    
    setFormData(prev => ({
      ...prev,
      lessonIds: [...new Set([...prev.lessonIds, ...groupLessonIds])],
      topicIds: [...new Set([...prev.topicIds, ...groupTopicIds])]
    }))
  }

  const handleGroupSelectNone = (group: string) => {
    const groupLessons = lessons.filter(lesson => lesson.group === group)
    const groupLessonIds = groupLessons.map(lesson => lesson.id)
    const groupTopicIds = groupLessons.flatMap(lesson => lesson.topics.map(topic => topic.id))
    
    setFormData(prev => ({
      ...prev,
      lessonIds: prev.lessonIds.filter(id => !groupLessonIds.includes(id)),
      topicIds: prev.topicIds.filter(id => !groupTopicIds.includes(id))
    }))
  }

  const handleLessonSelectAll = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) return
    
    const lessonTopicIds = lesson.topics.map(topic => topic.id)
    
    setFormData(prev => ({
      ...prev,
      lessonIds: prev.lessonIds.includes(lessonId) ? prev.lessonIds : [...prev.lessonIds, lessonId],
      topicIds: [...new Set([...prev.topicIds, ...lessonTopicIds])]
    }))
  }

  const handleLessonSelectNone = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) return
    
    const lessonTopicIds = lesson.topics.map(topic => topic.id)
    
    setFormData(prev => ({
      ...prev,
      lessonIds: prev.lessonIds.filter(id => id !== lessonId),
      topicIds: prev.topicIds.filter(id => !lessonTopicIds.includes(id)),
      topicQuestionCounts: Object.fromEntries(
        Object.entries(prev.topicQuestionCounts).filter(([topicId]) => !lessonTopicIds.includes(topicId))
      )
    }))
  }

  const handleQuestionCountClick = (topicId: string) => {
    const currentCount = formData.topicQuestionCounts[topicId] || 0
    setEditingQuestionCount({
      topicId,
      value: currentCount.toString()
    })
  }

  const handleQuestionCountChange = (value: string) => {
    setEditingQuestionCount(prev => prev ? { ...prev, value } : null)
  }

  const handleQuestionCountSave = () => {
    if (editingQuestionCount) {
      const count = parseInt(editingQuestionCount.value) || 0
      setFormData(prev => ({
        ...prev,
        topicQuestionCounts: {
          ...prev.topicQuestionCounts,
          [editingQuestionCount.topicId]: count
        }
      }))
      setEditingQuestionCount(null)
    }
  }

  const handleQuestionCountCancel = () => {
    setEditingQuestionCount(null)
  }

  const handleQuestionCountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuestionCountSave()
    } else if (e.key === 'Escape') {
      handleQuestionCountCancel()
    }
  }

  // Grup seçim durumunu kontrol et
  const isGroupSelected = (group: string) => {
    const groupLessons = lessons.filter(lesson => lesson.group === group)
    return groupLessons.length > 0 && groupLessons.every(lesson => formData.lessonIds.includes(lesson.id))
  }

  const isGroupPartiallySelected = (group: string) => {
    const groupLessons = lessons.filter(lesson => lesson.group === group)
    const selectedCount = groupLessons.filter(lesson => formData.lessonIds.includes(lesson.id)).length
    return selectedCount > 0 && selectedCount < groupLessons.length
  }

  // Dersleri gruplara ayır
  const groupedLessons = lessons.reduce((acc, lesson) => {
    if (!acc[lesson.group]) {
      acc[lesson.group] = []
    }
    acc[lesson.group].push(lesson)
    return acc
  }, {} as Record<string, Lesson[]>)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kaynak Yönetimi</h1>
        <p className="mt-2 text-gray-600">
          Kitaplarınızı ekleyin, düzenleyin ve derslerle ilişkilendirin.
        </p>
      </div>

      {/* Kaynak Ekleme/Düzenleme Formu */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {editingResource ? 'Kaynağı Düzenle' : 'Yeni Kaynak Ekle'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Kitap Adı *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Örn: Matematik Soru Bankası, Fizik Ders Kitabı..."
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Opsiyonel açıklama..."
              />
            </div>
          </div>

          {/* Ders Seçimi */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                İlişkili Dersler
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Tümünü Seç
                </button>
                <button
                  type="button"
                  onClick={handleSelectNone}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Hiçbirini Seçme
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
                              checked={formData.lessonIds.includes(lesson.id)}
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
                            {lesson.topics.map((topic) => (
                              <div key={topic.id} className="flex items-center justify-between">
                                <label className="flex items-center flex-1">
                                  <input
                                    type="checkbox"
                                    checked={formData.topicIds.includes(topic.id)}
                                    onChange={() => handleTopicToggle(topic.id, lesson.id)}
                                    disabled={!formData.lessonIds.includes(lesson.id)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className="ml-2 text-xs text-gray-600">
                                    {topic.order}. {topic.name}
                                  </span>
                                </label>
                                {formData.topicIds.includes(topic.id) && (
                                  <div className="flex items-center gap-2">
                                    {editingQuestionCount?.topicId === topic.id ? (
                                      <input
                                        type="number"
                                        value={editingQuestionCount.value}
                                        onChange={(e) => handleQuestionCountChange(e.target.value)}
                                        onBlur={handleQuestionCountSave}
                                        onKeyDown={handleQuestionCountKeyDown}
                                        className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="0"
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        onClick={() => handleQuestionCountClick(topic.id)}
                                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 cursor-pointer"
                                        title="Tıklayarak düzenle"
                                      >
                                        {formData.topicQuestionCounts[topic.id] ? `${formData.topicQuestionCounts[topic.id]} soru` : 'Soru ekle'}
                                      </span>
                                    )}
                                  </div>
                                )}
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
          </div>

          <div className="flex justify-end gap-2">
            {editingResource && (
              <button
                type="button"
                onClick={() => {
                  setEditingResource(null)
                  setFormData({ name: '', description: '', lessonIds: [], topicIds: [], topicQuestionCounts: {} })
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                İptal
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (editingResource ? 'Güncelleniyor...' : 'Ekleniyor...') : (editingResource ? 'Güncelle' : 'Kaynak Ekle')}
            </button>
          </div>
        </form>
      </div>

      {/* Kaynak Listesi */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Mevcut Kaynaklar
          </h3>
          
          {resources.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Kaynak bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">Henüz kaynak eklenmemiş.</p>
            </div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kitap Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Açıklama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İlişkili Dersler
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oluşturulma Tarihi
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resources.map((resource) => (
                    <tr key={resource.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {resource.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {resource.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="space-y-2">
                          {resource.lessons.map((rl) => (
                            <div key={rl.id} className="space-y-1">
                              <div className="flex items-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {rl.lesson.name}
                                </span>
                              </div>
                              {rl.topics && rl.topics.length > 0 && (
                                <div className="ml-2 flex flex-wrap gap-1">
                                  {rl.topics.map((rt) => (
                                    <span
                                      key={rt.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                    >
                                      {rt.topic.order}. {rt.topic.name}
                                      {rt.questionCount && rt.questionCount > 0 && (
                                        <span className="ml-1 text-blue-600">
                                          ({rt.questionCount} soru)
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(resource.createdAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
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
