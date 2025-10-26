'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { apiRequest } from '@/lib/api-client'

interface Teacher {
  id: string
  name: string
  email: string
  role: string
  createdAt?: string
  updatedAt?: string
  subscriptionEndDate?: string
  isSubscriptionActive?: boolean
}

export default function TeacherManagementPage() {
  const { data: session } = useSession()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
    subscriptionEndDate: ''
  })
  const [editTeacher, setEditTeacher] = useState({
    name: '',
    email: '',
    subscriptionEndDate: '',
    password: ''
  })

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiRequest<{ success: boolean; message: string; teacher: Teacher }>('/api/teachers', {
        method: 'POST',
        body: newTeacher,
      })

      setSuccess('Öğretmen başarıyla eklendi!')
      setNewTeacher({ name: '', email: '', password: '', subscriptionEndDate: '' })
      setShowAddForm(false)
      fetchTeachers() // Refresh the list
    } catch (error: any) {
      console.error('Teacher creation error:', error)
      setError(error.message || 'Öğretmen eklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTeacher) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiRequest<{ success: boolean; message: string; teacher: Teacher }>(`/api/teachers/${editingTeacher.id}/update`, {
        method: 'PUT',
        body: editTeacher,
      })

      setSuccess('Öğretmen bilgileri başarıyla güncellendi!')
      setEditTeacher({ name: '', email: '', subscriptionEndDate: '', password: '' })
      setShowEditForm(false)
      setEditingTeacher(null)
      fetchTeachers() // Refresh the list
    } catch (error: any) {
      console.error('Teacher update error:', error)
      setError(error.message || 'Öğretmen güncellenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setEditTeacher({
      name: teacher.name,
      email: teacher.email,
      subscriptionEndDate: teacher.subscriptionEndDate ? 
        new Date(teacher.subscriptionEndDate).toISOString().split('T')[0] : '',
      password: ''  // Always empty - super admin enters new password if they want to change it
    })
    setShowEditForm(true)
    setShowAddForm(false) // Close add form if open
  }

  const cancelEdit = () => {
    setShowEditForm(false)
    setEditingTeacher(null)
    setEditTeacher({ name: '', email: '', subscriptionEndDate: '', password: '' })
  }

  const fetchTeachers = async () => {
    try {
      const data = await apiRequest<{ teachers: Teacher[] }>('/api/teachers', {
        method: 'GET',
      })
      console.log('Teachers data:', data.teachers)
      setTeachers(data.teachers || [])
    } catch (error) {
      console.error('Öğretmenler yüklenirken hata:', error)
    }
  }

  // Load teachers on component mount
  useEffect(() => {
    fetchTeachers()
  }, [])

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-600">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Öğretmen Yönetimi</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {showAddForm ? 'İptal' : '+ Öğretmen Ekle'}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Add Teacher Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Yeni Öğretmen Ekle</h2>
          <form onSubmit={handleAddTeacher} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Ad Soyad
              </label>
              <input
                type="text"
                id="name"
                value={newTeacher.name}
                onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <input
                type="email"
                id="email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Şifre
              </label>
              <input
                type="password"
                id="password"
                value={newTeacher.password}
                onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="subscriptionEndDate" className="block text-sm font-medium text-gray-700">
                Abonelik Bitiş Tarihi
              </label>
              <input
                type="date"
                id="subscriptionEndDate"
                value={newTeacher.subscriptionEndDate}
                onChange={(e) => setNewTeacher({ ...newTeacher, subscriptionEndDate: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Boş bırakılırsa sınırsız abonelik verilir
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {loading ? 'Ekleniyor...' : 'Öğretmen Ekle'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Teacher Form */}
      {showEditForm && editingTeacher && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Öğretmen Düzenle</h2>
          <form onSubmit={handleEditTeacher} className="space-y-4">
            <div>
              <label htmlFor="editName" className="block text-sm font-medium text-gray-700">
                Ad Soyad
              </label>
              <input
                type="text"
                id="editName"
                value={editTeacher.name}
                onChange={(e) => setEditTeacher({ ...editTeacher, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <input
                type="email"
                id="editEmail"
                value={editTeacher.email}
                onChange={(e) => setEditTeacher({ ...editTeacher, email: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="editSubscriptionEndDate" className="block text-sm font-medium text-gray-700">
                Abonelik Bitiş Tarihi
              </label>
              <input
                type="date"
                id="editSubscriptionEndDate"
                value={editTeacher.subscriptionEndDate}
                onChange={(e) => setEditTeacher({ ...editTeacher, subscriptionEndDate: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Boş bırakılırsa sınırsız abonelik verilir
              </p>
            </div>
            <div>
              <label htmlFor="editPassword" className="block text-sm font-medium text-gray-700">
                Yeni Şifre (Opsiyonel)
              </label>
              <input
                type="password"
                id="editPassword"
                value={editTeacher.password}
                onChange={(e) => setEditTeacher({ ...editTeacher, password: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Boş bırakırsanız şifre değişmez"
              />
              <p className="mt-1 text-sm text-gray-500">
                Boş bırakırsanız mevcut şifre korunur. Değiştirmek için en az 6 karakter girin.
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teachers List */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Kayıtlı Öğretmenler</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Güncelleme Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abonelik Bitiş
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {teacher.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teacher.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {teacher.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString('tr-TR') : 'Tarih bilinmiyor'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teacher.updatedAt ? new Date(teacher.updatedAt).toLocaleDateString('tr-TR') : 'Güncellenmemiş'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {teacher.subscriptionEndDate ? new Date(teacher.subscriptionEndDate).toLocaleDateString('tr-TR') : 'Sınırsız'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      teacher.isSubscriptionActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {teacher.isSubscriptionActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => startEditTeacher(teacher)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {teachers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Henüz kayıtlı öğretmen bulunmamaktadır.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
