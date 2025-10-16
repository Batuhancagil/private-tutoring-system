'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  name: string
  email: string
}

interface Question {
  id: string
  questionText: string
  options: string[]
  correctAnswer: number
  explanation: string
  topic: {
    id: string
    name: string
    lesson: {
      name: string
      color: string
    }
  }
}

interface ProgressData {
  assignmentId: string
  topicId: string
  topicName: string
  lessonName: string
  lessonColor: string
  solvedCount: number
  totalCount: number
}

export default function QuestionSolvingPage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [progress, setProgress] = useState<ProgressData[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [loading, setLoading] = useState(true)
  // const [solvingMode, setSolvingMode] = useState<'practice' | 'test'>('practice')
  const router = useRouter()

  const fetchStudentProgress = useCallback(async (studentId: string) => {
    try {
      const response = await fetch(`/api/student-progress?studentId=${studentId}`)
      if (response.ok) {
        const progressData = await response.json()
        setProgress(progressData)
        
        // İlk soruyu yükle
        if (progressData.length > 0) {
          await loadNextQuestion(progressData[0].topicId)
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Token kontrolü
    const token = localStorage.getItem('studentToken')
    const studentData = localStorage.getItem('studentData')
    
    if (!token || !studentData) {
      router.push('/student/login')
      return
    }

    try {
      const parsedStudent = JSON.parse(studentData)
      setStudent(parsedStudent)
      fetchStudentProgress(parsedStudent.id)
    } catch {
      router.push('/student/login')
    }
  }, [router, fetchStudentProgress])

  const loadNextQuestion = async (topicId: string) => {
    try {
      // Mock question - gerçek uygulamada API'den gelecek
      const mockQuestion: Question = {
        id: `q-${Date.now()}`,
        questionText: "Bu konuyla ilgili bir soru örneği. Hangi seçenek doğrudur?",
        options: [
          "A) İlk seçenek",
          "B) İkinci seçenek", 
          "C) Üçüncü seçenek",
          "D) Dördüncü seçenek"
        ],
        correctAnswer: 1, // B seçeneği doğru
        explanation: "Bu sorunun açıklaması burada yer alacak. Doğru cevap B seçeneğidir çünkü...",
        topic: {
          id: topicId,
          name: "Konu Adı",
          lesson: {
            name: "Ders Adı",
            color: "blue"
          }
        }
      }
      
      setCurrentQuestion(mockQuestion)
      setSelectedAnswer(null)
      setShowResult(false)
    } catch (error) {
      console.error('Error loading question:', error)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return
    setSelectedAnswer(answerIndex)
  }

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion) return

    const correct = selectedAnswer === currentQuestion.correctAnswer
    setIsCorrect(correct)
    setShowResult(true)

    // Progress güncelle
    if (correct && student) {
      await updateProgress(student.id, currentQuestion.topic.id)
    }
  }

  const updateProgress = async (studentId: string, topicId: string) => {
    try {
      const response = await fetch('/api/student-progress/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          topicId,
          increment: 1
        })
      })

      if (response.ok) {
        // Progress listesini güncelle
        setProgress(prev => prev.map(p => 
          p.topicId === topicId 
            ? { ...p, solvedCount: p.solvedCount + 1 }
            : p
        ))
      }
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const handleNextQuestion = () => {
    // Bir sonraki konuya geç veya aynı konudan yeni soru
    if (progress.length > 0) {
      const currentIndex = progress.findIndex(p => p.topicId === currentQuestion?.topic.id) || 0
      const nextIndex = (currentIndex + 1) % progress.length
      loadNextQuestion(progress[nextIndex].topicId)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('studentToken')
    localStorage.removeItem('studentData')
    router.push('/student/login')
  }

  const getLessonColor = (color: string) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    }
    return colorClasses[color as keyof typeof colorClasses] || colorClasses.gray
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Soru yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!student || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Soru bulunamadı</p>
          <button
            onClick={() => router.push('/student/dashboard')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    )
  }

  const currentTopicProgress = progress.find(p => p.topicId === currentQuestion.topic.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Soru Çöz</h1>
              <p className="text-gray-600">Hoş geldin, {student.name}!</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/student/dashboard')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Progress Info */}
          {currentTopicProgress && (
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentQuestion.topic.name}
                  </h3>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getLessonColor(currentQuestion.topic.lesson.color)}`}>
                    {currentQuestion.topic.lesson.name}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {currentTopicProgress.solvedCount}/{currentTopicProgress.totalCount}
                  </div>
                  <div className="text-sm text-gray-600">soru çözüldü</div>
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${currentTopicProgress.totalCount > 0 ? Math.round((currentTopicProgress.solvedCount / currentTopicProgress.totalCount) * 100) : 0}%` 
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Question Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Soru
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                {currentQuestion.questionText}
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, index) => {
                let optionClass = "w-full p-4 text-left border-2 rounded-lg transition-all cursor-pointer hover:bg-gray-50"
                
                if (showResult) {
                  if (index === currentQuestion.correctAnswer) {
                    optionClass += " border-green-500 bg-green-50 text-green-800"
                  } else if (index === selectedAnswer && !isCorrect) {
                    optionClass += " border-red-500 bg-red-50 text-red-800"
                  } else {
                    optionClass += " border-gray-200 bg-gray-50 text-gray-600"
                  }
                } else if (selectedAnswer === index) {
                  optionClass += " border-blue-500 bg-blue-50 text-blue-800"
                } else {
                  optionClass += " border-gray-200 hover:border-gray-300"
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={optionClass}
                    disabled={showResult}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span>{option}</span>
                      {showResult && index === currentQuestion.correctAnswer && (
                        <span className="ml-auto text-green-600 text-xl">✓</span>
                      )}
                      {showResult && index === selectedAnswer && !isCorrect && (
                        <span className="ml-auto text-red-600 text-xl">✗</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {showResult && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">Açıklama:</h3>
                <p className="text-gray-700">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => router.push('/student/dashboard')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
              >
                Dashboard&apos;a Dön
              </button>
              
              <div className="flex gap-3">
                {!showResult ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswer === null}
                    className={`px-6 py-2 rounded-md font-medium ${
                      selectedAnswer === null
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    Cevapla
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
                  >
                    Sonraki Soru
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
