'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface WeeklySchedule {
  id: string
  title: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  weekPlans?: {
    id: string
    weekNumber: number
    startDate: string
    endDate: string
    weekTopics?: {
      id: string
      topicOrder: number
      assignment: {
        id: string
        topic: {
          id: string
          name: string
          order: number
          lesson: {
            id: string
            name: string
          }
        }
      }
    }[]
  }[]
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
}

export default function ProgramsPage() {
  const params = useParams()
  const studentId = params.id as string
  
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // Fetch schedules with pagination
  const fetchSchedules = async (page: number = 1) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/weekly-schedules?studentId=${studentId}&page=${page}&limit=10&includeDetails=true`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.schedules) {
          setSchedules(data.schedules)
          setPagination(data.pagination)
        } else {
          // Fallback for old API format
          setSchedules(data)
          setPagination(null)
        }
      } else {
        setError('Programlar yüklenirken hata oluştu')
      }
    } catch {
      setError('Programlar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Delete schedule
  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Bu programı silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      setDeleteLoading(scheduleId)
      const response = await fetch(`/api/weekly-schedules/${scheduleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh the list
        await fetchSchedules(currentPage)
      } else {
        alert('Program silinirken hata oluştu')
      }
    } catch {
      alert('Program silinirken hata oluştu')
    } finally {
      setDeleteLoading(null)
    }
  }

  // Toggle active status
  const toggleActiveStatus = async (scheduleId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/weekly-schedules/${scheduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      })

      if (response.ok) {
        // Refresh the list
        await fetchSchedules(currentPage)
      } else {
        alert('Program durumu güncellenirken hata oluştu')
      }
    } catch {
      alert('Program durumu güncellenirken hata oluştu')
    }
  }

  useEffect(() => {
    if (studentId) {
      fetchSchedules(currentPage)
    }
  }, [studentId, currentPage]) // fetchSchedules is stable, no need to include it

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getTotalWeeks = (schedule: WeeklySchedule) => {
    return schedule.weekPlans?.length || 0
  }

  const getTotalTopics = (schedule: WeeklySchedule) => {
    return schedule.weekPlans?.reduce((total, week) => {
      return total + (week.weekTopics?.length || 0)
    }, 0) || 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Hata</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Haftalık Ders Programları</h1>
              <p className="mt-2 text-gray-600">
                Öğrencinin haftalık ders programlarını yönetin
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/dashboard/students/${studentId}`}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                ← Öğrenci Detayı
              </Link>
              <Link
                href={`/dashboard/students/${studentId}?tab=schedule`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                + Yeni Program
              </Link>
            </div>
          </div>
        </div>

        {/* Programs List */}
        {schedules.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <span className="text-6xl mb-4 block">📅</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz program oluşturulmamış</h3>
            <p className="text-gray-600 mb-4">Bu öğrenci için henüz haftalık ders programı oluşturulmamış.</p>
            <Link
              href={`/dashboard/students/${studentId}?tab=schedule`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + İlk Programı Oluştur
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Programs Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {schedule.title}
                        </h3>
                        <div className="flex items-center mt-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              schedule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {schedule.isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => toggleActiveStatus(schedule.id, schedule.isActive)}
                          className={`p-1 rounded ${
                            schedule.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={schedule.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                        >
                          {schedule.isActive ? '✅' : '⏸️'}
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {getTotalWeeks(schedule)}
                        </div>
                        <div className="text-xs text-gray-500">Hafta</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {getTotalTopics(schedule)}
                        </div>
                        <div className="text-xs text-gray-500">Konu</div>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <span className="mr-2">📅</span>
                        <span>
                          {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Link
                        href={`/dashboard/students/${studentId}?tab=schedule&schedule=${schedule.id}`}
                        className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm hover:bg-blue-700 transition-colors"
                      >
                        📊 Detay
                      </Link>
                      <button
                        onClick={() => deleteSchedule(schedule.id)}
                        disabled={deleteLoading === schedule.id}
                        className="bg-red-600 text-white py-2 px-3 rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {deleteLoading === schedule.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Önceki
                </button>
                
                <span className="px-4 py-2 text-sm text-gray-700">
                  Sayfa {currentPage} / {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
