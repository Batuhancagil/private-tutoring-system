'use client'

import { useState } from 'react'
import Link from 'next/link'
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
} from '@dnd-kit/sortable'
import SortableTopic from './shared/SortableTopic'
import { AssignmentWithDetails, ProgressData, Resource } from '../types'
import { getLessonColor, getColorClasses } from '../utils'

interface ScheduleManagementProps {
  studentId: string
  assignments: AssignmentWithDetails[]
  assignmentsWithDetails: AssignmentWithDetails[]
  schedules: any[]
  activeSchedule: any
  loading: boolean
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => Resource[]
  onCreateSchedule: (data: any) => Promise<{ success: boolean; error?: string }>
  onSetActiveSchedule: (schedule: any) => void
  viewMode: 'monthly' | 'weekly'
  onViewModeChange: (mode: 'monthly' | 'weekly') => void
  currentMonthOffset: number
  onPreviousMonth: () => void
  onNextMonth: () => void
  onCurrentMonth: () => void
  onDragEnd: (event: DragEndEvent) => void
  activeTab: string
}

export default function ScheduleManagement({
  studentId,
  assignments,
  assignmentsWithDetails,
  schedules,
  activeSchedule,
  loading,
  progressData,
  getResourcesForTopic,
  onCreateSchedule,
  onSetActiveSchedule,
  viewMode,
  onViewModeChange,
  currentMonthOffset,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  onDragEnd,
  activeTab
}: ScheduleManagementProps) {
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWeek, setEditingWeek] = useState<any>(null)
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    startDate: '',
    endDate: ''
  })

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

      {/* 4-Week Monthly View with Drag & Drop */}
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        console.log('🖱️ Previous button clicked', { activeSchedule: !!activeSchedule, currentMonthOffset })
                        onPreviousMonth()
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      ← Önceki Ay
                    </button>
                    <button
                      onClick={() => {
                        console.log('🖱️ Today button clicked', { activeSchedule: !!activeSchedule })
                        onCurrentMonth()
                      }}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                    >
                      📅 Bugün
                    </button>
                    <button
                      onClick={() => {
                        const maxMonths = activeSchedule ? Math.ceil(activeSchedule.weekPlans.length / 4) - 1 : 0
                        const totalWeeks = activeSchedule ? activeSchedule.weekPlans.length : 0
                        console.log('🖱️ Next button clicked', {
                          hasActiveSchedule: !!activeSchedule,
                          currentMonthOffset,
                          maxMonths,
                          totalWeeks,
                          calculation: `${currentMonthOffset} >= ${maxMonths}`
                        })
                        onNextMonth()
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      Sonraki Ay →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Week Grid with Drag & Drop */}
            <div className="p-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    // Backend already sends the correct page, no need to slice!
                    const visibleWeeks = activeSchedule.weekPlans || []
                    console.log('📊 Rendering weeks:', {
                      currentMonthOffset,
                      weekPlansCount: activeSchedule.weekPlans?.length,
                      visibleWeeks: visibleWeeks.length,
                      firstWeekNumber: visibleWeeks[0]?.weekNumber,
                      lastWeekNumber: visibleWeeks[visibleWeeks.length - 1]?.weekNumber
                    })
                    return visibleWeeks
                  })().map((week: any, weekIndex: number) => {
                    const weekStart = new Date(week.startDate)
                    const weekEnd = new Date(week.endDate)
                    const weekTopics = week.weekTopics || []

                    return (
                      <div key={week.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-center mb-3">
                          <h4 className="text-sm font-medium text-gray-800">
                            Hafta {week.weekNumber}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {weekStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </p>
                          <button
                            onClick={() => {
                              setEditingWeek(week)
                              setShowEditModal(true)
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            ✏️ Düzenle
                          </button>
                        </div>

                        {/* Week Topics with Sortable Context */}
                        <div className="space-y-2">
                          {weekTopics.length > 0 ? (
                            <SortableContext
                              items={weekTopics.map((topic: any) => `${week.id}-${topic.id}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              {weekTopics.map((weekTopic: any, topicIndex: number) => (
                                <SortableTopic
                                  key={weekTopic.id}
                                  topic={weekTopic}
                                  weekId={week.id}
                                  topicIndex={topicIndex}
                                  progressData={progressData}
                                  getResourcesForTopic={getResourcesForTopic}
                                />
                              ))}
                            </SortableContext>
                          ) : (
                            <div className="text-center py-4">
                              <div className="text-gray-300 text-2xl mb-2">📅</div>
                              <p className="text-xs text-gray-500">Bu hafta için konu atanmamış</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </DndContext>

              {/* Show remaining weeks if more than 4 */}
              {activeSchedule.weekPlans.length > 4 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    + {activeSchedule.weekPlans.length - 4} hafta daha...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week Edit Modal */}
      {showEditModal && editingWeek && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              ✏️ Hafta {editingWeek.weekNumber} Düzenle
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Hafta Bilgileri</h4>
                <p className="text-xs text-gray-600">
                  {new Date(editingWeek.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {new Date(editingWeek.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Mevcut Konular</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {editingWeek.weekTopics?.map((topic: any, index: number) => {
                    const lessonColor = getLessonColor(topic.assignment.topic.lesson)
                    const colorClasses = getColorClasses(lessonColor)
                    return (
                      <div key={topic.id} className={`flex items-center justify-between ${colorClasses} border rounded-md p-2`}>
                        <div>
                          <span className="text-sm font-medium">
                            {topic.assignment.topic.order}. {topic.assignment.topic.name}
                          </span>
                          <span className="text-xs opacity-75 ml-2">
                            ({topic.assignment.topic.lesson.name})
                          </span>
                        </div>
                        <button className="text-red-600 hover:text-red-800 text-xs">
                          🗑️ Kaldır
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Konu Ekle</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {assignmentsWithDetails.filter(assignment =>
                    assignment && !editingWeek.weekTopics?.some((topic: any) => topic.assignmentId === assignment.id)
                  ).map(assignment => assignment && (() => {
                    const lessonColor = getLessonColor(assignment.lesson)
                    const colorClasses = getColorClasses(lessonColor)
                    return (
                      <div key={assignment.id} className={`flex items-center justify-between ${colorClasses} border rounded-md p-2`}>
                        <div>
                          <span className="text-sm font-medium">
                            {assignment.topic.order}. {assignment.topic.name}
                          </span>
                          <span className="text-xs opacity-75 ml-2">
                            ({assignment.lesson.name})
                          </span>
                        </div>
                        <button className="text-green-600 hover:text-green-800 text-xs">
                          ➕ Ekle
                        </button>
                      </div>
                    )
                  })())}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  // TODO: Save week changes
                  setShowEditModal(false)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Kaydet
              </button>
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
