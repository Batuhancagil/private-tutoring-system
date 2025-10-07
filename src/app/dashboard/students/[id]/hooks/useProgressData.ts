'use client'

import { useState, useEffect } from 'react'

interface ProgressData {
  id: string
  studentId: string
  assignmentId: string
  resourceId: string
  topicId: string
  solvedCount: number
  totalCount: number
  lastSolvedAt: string
  createdAt: string
  updatedAt: string
}

export function useProgressData(studentId: string) {
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProgressData = async () => {
    if (!studentId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/student-progress?studentId=${studentId}`)
      
      if (response.ok) {
        const data = await response.json()
        setProgressData(data)
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Progress verisi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  const incrementProgress = async (assignmentId: string, resourceId: string, topicId: string) => {
    try {
      const response = await fetch('/api/student-progress/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          assignmentId,
          resourceId,
          topicId,
          increment: 1
        })
      })
      
      if (response.ok) {
        await fetchProgressData()
      }
    } catch (err) {
      console.error('Progress increment failed:', err)
    }
  }

  useEffect(() => {
    fetchProgressData()
  }, [studentId])

  return { 
    progressData, 
    loading, 
    error, 
    refetch: fetchProgressData,
    incrementProgress 
  }
}
