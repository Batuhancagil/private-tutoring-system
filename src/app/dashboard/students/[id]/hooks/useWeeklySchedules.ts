'use client'

import { useState, useEffect } from 'react'

interface WeeklySchedule {
  id: string
  title: string
  startDate: string
  endDate: string
  isActive: boolean
  weekPlans: Array<{
    id: string
    weekNumber: number
    startDate: string
    endDate: string
    weekTopics: Array<{
      id: string
      topicOrder: number
      isCompleted: boolean
      assignment: {
        id: string
        topicId: string
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
    }>
  }>
}

export function useWeeklySchedules(studentId: string) {
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([])
  const [activeSchedule, setActiveSchedule] = useState<WeeklySchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeeklySchedules = async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/weekly-schedules?studentId=${studentId}&page=1&limit=10&includeDetails=true`)
      
      if (response.ok) {
        const data = await response.json()
        
        // New API format with pagination
        if (data.schedules) {
          setSchedules(data.schedules)
          if (data.schedules.length > 0) {
            setActiveSchedule(data.schedules[0])
          }
        } else {
          // Fallback for old API format
          setSchedules(data)
          if (data.length > 0) {
            setActiveSchedule(data[0])
          }
        }
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Program verisi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  const createSchedule = async (scheduleData: {
    title: string
    startDate: string
    endDate: string
    assignments: any[]
  }) => {
    try {
      const response = await fetch('/api/weekly-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          ...scheduleData
        })
      })

      if (response.ok) {
        await fetchWeeklySchedules()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.details || error.error }
      }
    } catch (err) {
      return { success: false, error: 'Program oluşturulurken hata oluştu' }
    }
  }

  useEffect(() => {
    fetchWeeklySchedules()
  }, [studentId])

  return { 
    schedules, 
    activeSchedule, 
    loading, 
    error, 
    refetch: fetchWeeklySchedules,
    createSchedule,
    setActiveSchedule
  }
}
