'use client'

import { useState, useEffect } from 'react'

interface Lesson {
  id: string
  name: string
  section: string
  createdAt: string
}

export default function Home() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [formData, setFormData] = useState({ name: '', section: '' })
  const [loading, setLoading] = useState(false)

  const fetchLessons = async () => {
    try {
      const response = await fetch('/api/lessons')
      const data = await response.json()
      setLessons(data)
    } catch (error) {
      console.error('Dersler yüklenirken hata:', error)
    }
  }

  useEffect(() => {
    fetchLessons()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.section) {
      alert('Ders adı ve bölümü zorunludur!')
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
        setFormData({ name: '', section: '' })
        fetchLessons()
        alert('Ders başarıyla eklendi!')
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Özel Ders Yönetim Sistemi
        </h1>

        {/* Ders Ekleme Formu */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Ders Ekle</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Ders Adı *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: Matematik, Fizik, Kimya..."
                required
              />
            </div>
            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">
                Ders Bölümü *
              </label>
              <input
                type="text"
                id="section"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: 9. Sınıf, 10. Sınıf, Lise..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Ekleniyor...' : 'Ders Ekle'}
            </button>
          </form>
        </div>

        {/* Ders Listesi */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Ders Listesi</h2>
          {lessons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Henüz ders eklenmemiş.</p>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">{lesson.name}</h3>
                      <p className="text-sm text-gray-600">{lesson.section}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(lesson.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}