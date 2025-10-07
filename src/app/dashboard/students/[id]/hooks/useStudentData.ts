'use client'

import { useState, useEffect } from 'react'

interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  parentName: string | null
  parentPhone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export function useStudentData(studentId: string) {
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudent = async () => {
      if (!studentId) return
      
      try {
        setLoading(true)
        const response = await fetch(`/api/students/${studentId}`)
        
        if (!response.ok) {
          throw new Error('Öğrenci bulunamadı')
        }
        
        const data = await response.json()
        setStudent(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [studentId])

  return { student, loading, error }
}
