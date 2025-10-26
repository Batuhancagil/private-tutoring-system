'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'
import { apiRequest } from '@/lib/api-client'

export default function SuperAdminPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newName, setName] = useState(session?.user?.name || '')
  const [newEmail, setEmail] = useState(session?.user?.email || '')
  const [migrationLoading, setMigrationLoading] = useState(false)
  const [updatedAtMigrationLoading, setUpdatedAtMigrationLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('Yeni şifreler eşleşmiyor')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      setLoading(false)
      return
    }

    try {
      const data = await apiRequest<{ success: boolean; message: string }>('/api/change-superadmin-password', {
        method: 'POST',
        body: { newPassword: newPassword },
      })

      console.log('Password API Response data:', data)
      setSuccess('Şifre başarıyla güncellendi!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Password change error:', error)
      setError(error.message || 'Şifre güncellenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiRequest<{ success: boolean; message: string; user: { name: string; email: string } }>('/api/update-superadmin-profile', {
        method: 'POST',
        body: { 
          name: newName,
          email: newEmail 
        },
      })

      console.log('API Response data:', data)
      setSuccess('Profil bilgileri başarıyla güncellendi!')
      
      // Update the session with new user data
      if (data.user) {
        setName(data.user.name)
        setEmail(data.user.email)
      }
      // Only refresh after successful API response
      setTimeout(() => {
        window.location.reload()
      }, 1000) // Wait 1 second to show success message
    } catch (error: any) {
      console.error('Profile update error:', error)
      setError(error.message || 'Profil güncellenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleMigration = async () => {
    setMigrationLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiRequest<{ success: boolean; message: string }>('/api/add-created-at-column', {
        method: 'POST',
      })

      console.log('Migration response:', data)
      setSuccess('Veritabanı güncellendi! CreatedAt alanı eklendi.')
    } catch (error: any) {
      console.error('Migration error:', error)
      setError(error.message || 'Veritabanı güncellenirken hata oluştu')
    } finally {
      setMigrationLoading(false)
    }
  }

  const handleUpdatedAtMigration = async () => {
    setUpdatedAtMigrationLoading(true)
    setError('')
    setSuccess('')

    try {
      const data = await apiRequest<{ success: boolean; message: string }>('/api/add-updated-at-column', {
        method: 'POST',
      })

      console.log('UpdatedAt migration response:', data)
      setSuccess('Veritabanı güncellendi! UpdatedAt alanı eklendi.')
    } catch (error: any) {
      console.error('UpdatedAt migration error:', error)
      setError(error.message || 'UpdatedAt alanı eklenirken hata oluştu')
    } finally {
      setUpdatedAtMigrationLoading(false)
    }
  }

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Ayarları</h1>
        <p className="text-gray-600">Hesap bilgilerinizi ve şifrenizi yönetin</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profil Bilgileri</h2>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Ad Soyad
              </label>
              <input
                type="text"
                id="name"
                value={newName}
                onChange={(e) => setName(e.target.value)}
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
                value={newEmail}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {loading ? 'Güncelleniyor...' : 'Profil Güncelle'}
            </button>
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Şifre Değiştir</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Yeni Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Şifre Tekrar
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {loading ? 'Güncelleniyor...' : 'Şifre Değiştir'}
            </button>
          </form>
        </div>
      </div>

      {/* Current Account Info */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mevcut Hesap Bilgileri</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">E-posta</label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rol</label>
            <p className="mt-1 text-sm text-gray-900">{session?.user?.role}</p>
          </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hesap Durumu</label>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                Aktif
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Son Güncelleme</label>
              <p className="text-sm text-gray-900">
                {session?.user?.updatedAt 
                  ? new Date(session.user.updatedAt).toLocaleString('tr-TR')
                  : 'Henüz güncellenmemiş'
                }
              </p>
            </div>
        </div>

        {/* Database Migration */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Veritabanı Güncelleme</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Veritabanına createdAt alanını eklemek için bu butona tıklayın. Bu işlem sadece bir kez yapılmalıdır.
              </p>
              <button
                onClick={handleMigration}
                disabled={migrationLoading}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {migrationLoading ? 'Güncelleniyor...' : 'CreatedAt Sütunu Ekle'}
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Veritabanına updatedAt alanını eklemek için bu butona tıklayın. Bu alan profil değişikliklerini takip eder.
              </p>
              <button
                onClick={handleUpdatedAtMigration}
                disabled={updatedAtMigrationLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {updatedAtMigrationLoading ? 'Güncelleniyor...' : 'UpdatedAt Sütunu Ekle'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
