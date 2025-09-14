'use client'

import { useState, useEffect } from 'react'

interface Lesson {
  id: string
  name: string
  group: string
}

interface ResourceLesson {
  id: string
  lesson: Lesson
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
    lessonIds: [] as string[] 
  })
  const [loading, setLoading] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)

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
        setFormData({ name: '', description: '', lessonIds: [] })
        setEditingResource(null)
        fetchResources()
      } else {
        const error = await response.json()
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
      lessonIds: resource.lessons.map(rl => rl.lesson.id)
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
    setFormData(prev => ({
      ...prev,
      lessonIds: prev.lessonIds.includes(lessonId)
        ? prev.lessonIds.filter(id => id !== lessonId)
        : [...prev.lessonIds, lessonId]
    }))
  }

  const handleSelectAll = () => {
    setFormData(prev => ({
      ...prev,
      lessonIds: lessons.map(lesson => lesson.id)
    }))
  }

  const handleSelectNone = () => {
    setFormData(prev => ({
      ...prev,
      lessonIds: []
    }))
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
            
            <div className="border border-gray-300 rounded-md p-4 max-h-60 overflow-y-auto">
              {Object.entries(groupedLessons).map(([group, groupLessons]) => (
                <div key={group} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">{group}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {groupLessons.map((lesson) => (
                      <label key={lesson.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.lessonIds.includes(lesson.id)}
                          onChange={() => handleLessonToggle(lesson.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{lesson.name}</span>
                      </label>
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
                  setFormData({ name: '', description: '', lessonIds: [] })
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
                        <div className="flex flex-wrap gap-1">
                          {resource.lessons.map((rl) => (
                            <span
                              key={rl.id}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {rl.lesson.name}
                            </span>
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
