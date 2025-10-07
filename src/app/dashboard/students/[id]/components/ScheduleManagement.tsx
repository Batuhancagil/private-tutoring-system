'use client'

import { useState } from 'react'
import Link from 'next/link'
import WeekCard from './shared/WeekCard'

interface ScheduleManagementProps {
  studentId: string
  assignments: any[]
  schedules: any[]
  activeSchedule: any
  loading: boolean
  onEditWeek: (week: any) => void
  onCreateSchedule: (data: any) => Promise<{ success: boolean; error?: string }>
  onSetActiveSchedule: (schedule: any) => void
  viewMode: 'monthly' | 'weekly'
  onViewModeChange: (mode: 'monthly' | 'weekly') => void
  currentMonthOffset: number
  onPreviousMonth: () => void
  onNextMonth: () => void
  onCurrentMonth: () => void
}

export default function ScheduleManagement({
  studentId,
  assignments,
  schedules,
  activeSchedule,
  loading,
  onEditWeek,
  onCreateSchedule,
  onSetActiveSchedule,
  viewMode,
  onViewModeChange,
  currentMonthOffset,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth
}: ScheduleManagementProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    startDate: '',
    endDate: ''
  })

  const handleCreateSchedule = async () => {
    if (!scheduleForm.title || !scheduleForm.startDate || !scheduleForm.endDate) {
      alert('Lütfen tüm alanları doldurun')
      return
    }

    const result = await onCreateSchedule({
      title: scheduleForm.title,
      startDate: scheduleForm.startDate,
      endDate: scheduleForm.endDate,
      assignments
    })

    if (result.success) {
      setShowScheduleModal(false)
      setScheduleForm({ title: '', startDate: '', endDate: '' })
    } else {
      alert('Program oluşturulurken hata: ' + result.error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Haftalık Ders Programı</h2>
          <div className="flex gap-2">
            {assignments.length > 0 && (
              <button 
                onClick={() => setShowScheduleModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                📅 Program Oluştur
              </button>
            )}
            {schedules.length > 0 && (
              <div className="flex space-x-2">
                <Link
                  href={`/dashboard/students/${studentId}/programs`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  📋 Programları Yönet
                </Link>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                  ✏️ Programı Düzenle
                </button>
              </div>
            )}
          </div>
        </div>
        
        {assignments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
            <p className="text-gray-400 text-sm mb-6">
              Önce öğrenciye konu atayın, sonra ders programı oluşturun.
            </p>
          </div>
        )}
        
        {assignments.length > 0 && schedules.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <p className="text-gray-500 text-lg mb-4">Henüz program oluşturulmamış</p>
            <p className="text-gray-400 text-sm mb-6">
              Öğrenciye atanmış konular var. Haftalık ders programı oluşturabilirsiniz.
            </p>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              Program Oluştur
            </button>
          </div>
        )}
      </div>

      {/* Schedule View */}
      {activeSchedule && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            {/* Schedule Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {activeSchedule.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(activeSchedule.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} - {new Date(activeSchedule.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-500">
                    💡 Konuları sürükleyip bırakarak sıralayabilirsiniz
                  </div>
                  <div className="flex items-center gap-4">
                    {/* View Mode Filter */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => onViewModeChange('monthly')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          viewMode === 'monthly'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        📅 Aylık
                      </button>
                      <button
                        onClick={() => onViewModeChange('weekly')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                          viewMode === 'weekly'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        📋 Haftalık
                      </button>
                    </div>
                    
                    {/* Navigation Buttons - Only show in monthly view */}
                    {viewMode === 'monthly' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onPreviousMonth}
                          disabled={!activeSchedule || currentMonthOffset === 0}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ← Önceki Ay
                        </button>
                        <button
                          onClick={onCurrentMonth}
                          disabled={!activeSchedule}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          📅 Bugün
                        </button>
                        <button
                          onClick={onNextMonth}
                          disabled={!activeSchedule || currentMonthOffset >= Math.ceil(activeSchedule.weekPlans.length / 4) - 1}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sonraki Ay →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Schedule Content */}
            <div className="p-4">
              {viewMode === 'monthly' ? (
                /* Monthly View - 4-Week Grid */
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {activeSchedule.weekPlans.slice(currentMonthOffset * 4, (currentMonthOffset + 1) * 4).map((week: any) => (
                    <WeekCard
                      key={week.id}
                      week={week}
                      onEdit={() => onEditWeek(week)}
                      isMonthlyView={true}
                    />
                  ))}
                </div>
              ) : (
                /* Weekly View - All weeks in a list */
                <div className="space-y-4">
                  {activeSchedule.weekPlans.map((week: any) => (
                    <WeekCard
                      key={week.id}
                      week={week}
                      onEdit={() => onEditWeek(week)}
                      isMonthlyView={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Creation Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📅 Ders Programı Oluştur
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program Başlığı
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2024 Bahar Dönemi"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={scheduleForm.startDate}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={scheduleForm.endDate}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Program Detayları:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• {assignments.length} atanmış konu bulundu</li>
                  <li>• Her hafta farklı derslerden konular işlenecek</li>
                  <li>• Örnek: 1. Hafta Matematik + Fizik konuları</li>
                  <li>• Konular ders gruplarına göre dağıtılacak</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                İptal
              </button>
              <button
                onClick={handleCreateSchedule}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Program Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
