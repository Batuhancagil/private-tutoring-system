'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import TopicAssignmentModule from '@/components/TopicAssignmentModule'
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
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

interface Lesson {
  id: string
  name: string
  group: string
  type: string
  subject: string | null
  topics: Topic[]
  createdAt: string
}

interface Topic {
  id: string
  name: string
  order: number
  lessonId: string
  createdAt: string
}

interface StudentAssignment {
  id: string
  studentId: string
  topicId: string
  assignedAt: string
  completed: boolean
  questionCounts?: Record<string, Record<string, number>>
}

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

interface Resource {
  id: string
  name: string
  description: string
  userId?: string
  lessonIds: string[]
  questionCount: number
  createdAt: string
  updatedAt?: string
  lessons?: Array<{
    id: string
    resourceId: string
    lessonId: string
    lesson: {
      id: string
      name: string
      group: string
      type: string
      subject: string | null
      topics: Array<{
        id: string
        name: string
        order: number
        lessonId: string
        createdAt: string
      }>
    }
    topics: Array<{
      id: string
      resourceId: string
      topicId: string
      resourceLessonId: string
      questionCount: number
      topic: {
        id: string
        name: string
        order: number
        lessonId: string
        createdAt: string
      }
    }>
  }>
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string
  
  const [student, setStudent] = useState<Student | null>(null)
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [progressData, setProgressData] = useState<ProgressData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignmentModule, setShowAssignmentModule] = useState(false)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topic-tracking' | 'schedule' | 'student-info'>('dashboard')
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedStartWeek, setSelectedStartWeek] = useState<number>(1)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [weeklySchedules, setWeeklySchedules] = useState<any[]>([])
  const [activeSchedule, setActiveSchedule] = useState<any>(null)
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    startDate: '',
    endDate: ''
  })
  const [draggedItems, setDraggedItems] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingWeek, setEditingWeek] = useState<any>(null)
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0)
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly'>('monthly')
  
  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Toggle topic expansion
  const toggleTopicExpansion = (topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(topicId)) {
        newSet.delete(topicId)
      } else {
        newSet.add(topicId)
      }
      return newSet
    })
  }

  // Toggle lesson expansion
  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId)
      } else {
        newSet.add(lessonId)
      }
      return newSet
    })
  }

  // Fetch progress data
  const fetchProgressData = async () => {
    try {
      const response = await fetch(`/api/student-progress?studentId=${studentId}`)
      if (response.ok) {
        const progress = await response.json()
        setProgressData(progress)
      }
    } catch (error) {
      // Error handled silently in production
    }
  }

  // Fetch weekly schedules
  const fetchWeeklySchedules = async () => {
    try {
      const response = await fetch(`/api/weekly-schedules?studentId=${studentId}&page=1&limit=10&includeDetails=true`)
      if (response.ok) {
        const data = await response.json()
        // New API format with pagination
        if (data.schedules) {
          setWeeklySchedules(data.schedules)
          // Set the first active schedule as default
          if (data.schedules.length > 0) {
            setActiveSchedule(data.schedules[0])
          }
        } else {
          // Fallback for old API format
          setWeeklySchedules(data)
          if (data.length > 0) {
            setActiveSchedule(data[0])
          }
        }
      }
    } catch (error) {
      // Error handled silently in production
    }
  }

  // Handle drag end for topic rearrangement
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || !activeSchedule) return
    
    const activeWeekId = active.id.toString().split('-')[0]
    const overWeekId = over.id.toString().split('-')[0]
    
    if (activeWeekId === overWeekId) {
      // Reordering within same week
      const weekIndex = activeSchedule.weekPlans.findIndex((week: any) => week.id === activeWeekId)
      if (weekIndex === -1) return
      
      const week = activeSchedule.weekPlans[weekIndex]
      const oldIndex = week.weekTopics.findIndex((topic: any) => topic.id === active.id)
      const newIndex = week.weekTopics.findIndex((topic: any) => topic.id === over.id)
      
      if (oldIndex !== newIndex) {
        const newWeekTopics = arrayMove(week.weekTopics, oldIndex, newIndex)
        
        // Update local state
        const newSchedule = { ...activeSchedule }
        newSchedule.weekPlans[weekIndex].weekTopics = newWeekTopics
        setActiveSchedule(newSchedule)
        
        // TODO: Update database with new order
      }
    } else {
      // Moving between weeks
      // TODO: Implement cross-week topic movement
    }
  }
  
  // Navigate between months
  const goToPreviousMonth = () => {
    if (activeSchedule) {
      setCurrentMonthOffset(prev => Math.max(prev - 1, 0))
    }
  }
  
  const goToNextMonth = () => {
    if (activeSchedule) {
      const maxMonths = Math.ceil(activeSchedule.weekPlans.length / 4) - 1
      setCurrentMonthOffset(prev => Math.min(prev + 1, maxMonths))
    }
  }
  
  const goToCurrentMonth = () => {
    setCurrentMonthOffset(0)
    // Also set the first schedule as active if we have schedules
    if (weeklySchedules.length > 0) {
      setActiveSchedule(weeklySchedules[0])
    }
  }

  // Create weekly schedule
  const createWeeklySchedule = async () => {
    if (!scheduleForm.title || !scheduleForm.startDate || !scheduleForm.endDate) {
      alert('Lütfen tüm alanları doldurun')
      return
    }

    try {
      const response = await fetch('/api/weekly-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId,
          title: scheduleForm.title,
          startDate: scheduleForm.startDate,
          endDate: scheduleForm.endDate,
          assignments: assignments // All assignments will be distributed across weeks
        })
      })

      if (response.ok) {
        setShowScheduleModal(false)
        setScheduleForm({ title: '', startDate: '', endDate: '' })
        await fetchWeeklySchedules()
      } else {
        const error = await response.json()
        alert('Program oluşturulurken hata: ' + (error.details || error.error))
      }
    } catch (error) {
      alert('Program oluşturulurken hata oluştu')
    }
  }

  // Increment progress
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
        // Refresh progress data
        await fetchProgressData()
      }
    } catch (error) {
      // Error handled silently in production
    }
  }

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true)
        
        // Fetch student info
        const studentRes = await fetch(`/api/students/${studentId}`)
        if (!studentRes.ok) {
          throw new Error('Öğrenci bulunamadı')
        }
        const studentData = await studentRes.json()
        setStudent(studentData)

               // Fetch assignments, lessons, and resources
               const [assignmentsRes, lessonsRes, resourcesRes] = await Promise.all([
                 fetch(`/api/student-assignments?studentId=${studentId}`),
                 fetch('/api/lessons'),
                 fetch('/api/resources')
               ])
        
        if (assignmentsRes.ok) {
          const assignmentsData = await assignmentsRes.json()
          setAssignments(assignmentsData)
        }
        
        if (lessonsRes.ok) {
          const lessonsData = await lessonsRes.json()
          setLessons(lessonsData)
        }
        
        if (resourcesRes.ok) {
          const resourcesData = await resourcesRes.json()
          setResources(resourcesData)
        }

        // Fetch progress data
        await fetchProgressData()
        
        // Fetch weekly schedules
        await fetchWeeklySchedules()

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchStudentData()
    }
  }, [studentId])

  // Create a flat list of assignments with topic and lesson info, sorted by order
  const assignmentsWithDetails = assignments
    .map(assignment => {
      const topic = lessons.flatMap(l => l.topics).find(t => t.id === assignment.topicId)
      if (!topic) return null
      
      const lesson = lessons.find(l => l.id === topic.lessonId)
      if (!lesson) return null
      
      return {
        ...assignment,
        topic,
        lesson
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by lesson group first, then by lesson name, then by topic order
      if (a!.lesson.group !== b!.lesson.group) {
        return a!.lesson.group.localeCompare(b!.lesson.group)
      }
      if (a!.lesson.name !== b!.lesson.name) {
        return a!.lesson.name.localeCompare(b!.lesson.name)
      }
      return a!.topic.order - b!.topic.order
    })

  // Get resources for a specific topic
  const getResourcesForTopic = (topicId: string) => {
    
    interface ResourceWithQuestionCount {
      id: string;
      name: string;
      description: string | null;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
      lessons: Resource['lessons'];
      questionCount: number;
      resourceTopicId: string;
    }
    
    const result: ResourceWithQuestionCount[] = []
    
    resources.forEach(resource => {
      // Check if resource has lessons and it's an array
      if (!resource.lessons || !Array.isArray(resource.lessons)) {
        return
      }
      
      resource.lessons.forEach(resourceLesson => {
        if (!resourceLesson.lesson || !resourceLesson.topics || !Array.isArray(resourceLesson.topics)) {
          return
        }
        
        resourceLesson.topics.forEach(resourceTopic => {
          if (resourceTopic.topic.id === topicId) {
            
            // Create a resource object with the questionCount from ResourceTopic
            const resourceWithQuestionCount: ResourceWithQuestionCount = {
              id: resource.id,
              name: resource.name,
              description: resource.description,
              userId: resource.userId || 'demo-user-id',
              createdAt: new Date(resource.createdAt),
              updatedAt: resource.updatedAt ? new Date(resource.updatedAt) : new Date(),
              lessons: resource.lessons || [],
              questionCount: resourceTopic.questionCount || 0,
              resourceTopicId: resourceTopic.id
            }
            
            // Check if we already added this resource (avoid duplicates)
            const existingIndex = result.findIndex(r => r.id === resource.id)
            if (existingIndex >= 0) {
              // If we already have this resource, add the question count to existing
              result[existingIndex].questionCount += resourceTopic.questionCount || 0
            } else {
              result.push(resourceWithQuestionCount)
            }
          }
        })
      })
    })
    
    return result
  }

  // Dynamic color system for lessons
  const getLessonColor = (lessonName: string) => {
    // Predefined colors for common lessons
    const predefinedColors = {
      'Matematik': 'blue',
      'Fizik': 'purple', 
      'Kimya': 'green',
      'Biyoloji': 'emerald',
      'Türkçe': 'orange',
      'İngilizce': 'red',
      'Tarih': 'yellow',
      'Coğrafya': 'indigo',
      'Felsefe': 'pink',
      'Edebiyat': 'teal'
    }
    
    // If lesson has predefined color, use it
    if (predefinedColors[lessonName as keyof typeof predefinedColors]) {
      return predefinedColors[lessonName as keyof typeof predefinedColors]
    }
    
    // For new lessons, generate consistent color based on lesson name hash
    const availableColors = ['blue', 'purple', 'green', 'emerald', 'orange', 'red', 'yellow', 'indigo', 'pink', 'teal', 'cyan', 'lime', 'amber', 'rose', 'violet']
    
    // Simple hash function for consistent color assignment
    let hash = 0
    for (let i = 0; i < lessonName.length; i++) {
      hash = ((hash << 5) - hash + lessonName.charCodeAt(i)) & 0xffffffff
    }
    
    const colorIndex = Math.abs(hash) % availableColors.length
    return availableColors[colorIndex]
  }

  // Sortable Topic Component
  const SortableTopic = ({ topic, weekId, topicIndex }: { topic: any, weekId: string, topicIndex: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: `${weekId}-${topic.id}` })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    const assignment = topic.assignment
    const topicResources = getResourcesForTopic(assignment.topicId)
    const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
    const totalStudentQuestions = topicResources.reduce((sum, resource) => {
      const resourceCounts = assignmentQuestionCounts[resource.id] || {}
      const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
      return sum + studentCount
    }, 0)
    
    const completedQuestions = topicResources.reduce((sum, resource) => {
      const progressRecord = progressData.find(progress => 
        progress.resourceId === resource.id && 
        progress.assignmentId === assignment.id
      )
      return sum + (progressRecord?.solvedCount || 0)
    }, 0)
    
    const progressPercentage = totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0
    
    const lessonColor = getLessonColor(assignment.topic.lesson.name)
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      purple: 'bg-purple-50 border-purple-200 text-purple-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      orange: 'bg-orange-50 border-orange-200 text-orange-800',
      red: 'bg-red-50 border-red-200 text-red-800',
      gray: 'bg-gray-50 border-gray-200 text-gray-800'
    }
    
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`${colorClasses[lessonColor as keyof typeof colorClasses]} rounded-md p-2 border cursor-move hover:shadow-md transition-shadow`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium">
            {assignment.topic.order}. {assignment.topic.name}
          </div>
          <div className="text-xs opacity-50">⋮⋮</div>
        </div>
        <div className="text-xs opacity-75 mb-1">
          {assignment.topic.lesson.name}
        </div>
        <div className="text-xs opacity-90 mb-1">
          {completedQuestions}/{totalStudentQuestions} soru ({progressPercentage}%)
        </div>
        <div className={`w-full bg-${lessonColor}-200 rounded-full h-1 mb-1`}>
          <div 
            className={`bg-${lessonColor}-500 h-1 rounded-full transition-all duration-500`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        {topic.isCompleted && (
          <div className="text-xs opacity-90 flex items-center">
            <span className="mr-1">✅</span>
            Tamamlandı
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hata</h1>
          <p className="text-gray-600">{error || 'Öğrenci bulunamadı'}</p>
          <button
            onClick={() => router.push('/dashboard/students')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Geri Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tab Navigation - Full Width */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-200">
          <div className="p-2">
            <nav className="flex space-x-2 w-full">
            <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">📊</span>
                Dashboard
            </button>
              <button
                onClick={() => setActiveTab('topic-tracking')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'topic-tracking'
                    ? 'bg-green-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">📚</span>
                Konu Takip
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'schedule'
                    ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">📅</span>
                Ders Programı
              </button>
              <button
                onClick={() => setActiveTab('student-info')}
                className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-semibold text-base transition-all duration-200 ${
                  activeTab === 'student-info'
                    ? 'bg-indigo-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 hover:shadow-md'
                }`}
              >
                <span className="text-xl mr-3">👤</span>
                Öğrenci Bilgileri
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Dashboard Overview */}
          <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Genel İlerleme Özeti</h2>
                <p className="text-gray-600 mt-1">Öğrencinin genel performans durumu</p>
                </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Toplam Atanan Konu */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Toplam Atanan Konu</p>
                      <p className="text-2xl font-bold text-blue-800 mt-1">{assignments.length}</p>
              </div>
                    <div className="text-blue-400 text-3xl">📚</div>
              </div>
          </div>

                {/* Toplam Hedef Soru */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Toplam Hedef Soru</p>
                      <p className="text-2xl font-bold text-green-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                          const topicResources = getResourcesForTopic(assignment.topicId)
                          const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                          return total + topicResources.reduce((sum, resource) => {
                            const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                            const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                            return sum + studentCount
                          }, 0)
                        }, 0)}
                      </p>
                </div>
                    <div className="text-green-400 text-3xl">🎯</div>
            </div>
          </div>

                {/* Çözülen Soru */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Çözülen Soru</p>
                      <p className="text-2xl font-bold text-purple-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                          const topicResources = getResourcesForTopic(assignment.topicId)
                          return total + topicResources.reduce((sum, resource) => {
                            const progressRecord = progressData.find(progress => 
                              progress.resourceId === resource.id && 
                              progress.assignmentId === assignment.id
                            )
                            return sum + (progressRecord?.solvedCount || 0)
                          }, 0)
                        }, 0)}
                      </p>
                </div>
                    <div className="text-purple-400 text-3xl">✅</div>
              </div>
              </div>

                {/* Genel İlerleme */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Genel İlerleme</p>
                      <p className="text-2xl font-bold text-orange-800 mt-1">
                        {(() => {
                          const totalTarget = assignments.reduce((total, assignment) => {
                    const topicResources = getResourcesForTopic(assignment.topicId)
                            const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                    return total + topicResources.reduce((sum, resource) => {
                              const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                              const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                              return sum + studentCount
                            }, 0)
                          }, 0)
                          
                          const totalCompleted = assignments.reduce((total, assignment) => {
                            const topicResources = getResourcesForTopic(assignment.topicId)
                            return total + topicResources.reduce((sum, resource) => {
                              const progressRecord = progressData.find(progress => 
                                progress.resourceId === resource.id && 
                                progress.assignmentId === assignment.id
                              )
                              return sum + (progressRecord?.solvedCount || 0)
                            }, 0)
                          }, 0)
                          
                          return totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0
                        })()}%
                      </p>
                    </div>
                    <div className="text-orange-400 text-3xl">📈</div>
              </div>
            </div>
            </div>
          </div>

          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Student Header */}
          <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                  <p className="text-gray-600 mt-1">Ders Bazlı İlerleme Grafiği</p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/students')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
                >
                  <span className="mr-2">←</span>
                  Geri
                </button>
              </div>
              
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Toplam Atanan Konu */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Toplam Atanan Konu</p>
                      <p className="text-2xl font-bold text-blue-800 mt-1">{assignments.length}</p>
              </div>
                    <div className="text-blue-400 text-3xl">📚</div>
            </div>
          </div>

                {/* Toplam Hedef Soru */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Toplam Hedef Soru</p>
                      <p className="text-2xl font-bold text-green-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                          const topicResources = getResourcesForTopic(assignment.topicId)
                          const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                          return total + topicResources.reduce((sum, resource) => {
                            const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                            const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                            return sum + studentCount
                          }, 0)
                        }, 0)}
                      </p>
                </div>
                    <div className="text-green-400 text-3xl">🎯</div>
              </div>
                </div>

                {/* Çözülen Soru */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Çözülen Soru</p>
                      <p className="text-2xl font-bold text-purple-800 mt-1">
                        {assignments.reduce((total, assignment) => {
                    const topicResources = getResourcesForTopic(assignment.topicId)
                    return total + topicResources.reduce((sum, resource) => {
                            const progressRecord = progressData.find(progress => 
                              progress.resourceId === resource.id && 
                              progress.assignmentId === assignment.id
                            )
                            return sum + (progressRecord?.solvedCount || 0)
                    }, 0)
                  }, 0)}
                </p>
              </div>
                    <div className="text-purple-400 text-3xl">✅</div>
                  </div>
                </div>

                {/* Genel İlerleme */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-600 text-sm font-medium">Genel İlerleme</p>
                      <p className="text-2xl font-bold text-orange-800 mt-1">
                        {(() => {
                          const totalTarget = assignments.reduce((total, assignment) => {
                            const topicResources = getResourcesForTopic(assignment.topicId)
                            const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                            return total + topicResources.reduce((sum, resource) => {
                              const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                              const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                              return sum + studentCount
                            }, 0)
                          }, 0)
                          
                          const totalCompleted = assignments.reduce((total, assignment) => {
                            const topicResources = getResourcesForTopic(assignment.topicId)
                            return total + topicResources.reduce((sum, resource) => {
                              const progressRecord = progressData.find(progress => 
                                progress.resourceId === resource.id && 
                                progress.assignmentId === assignment.id
                              )
                              return sum + (progressRecord?.solvedCount || 0)
                            }, 0)
                          }, 0)
                          
                          return totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0
                        })()}%
                      </p>
                    </div>
                    <div className="text-orange-400 text-3xl">📈</div>
                  </div>
            </div>
          </div>
        </div>


            {/* Progress Chart by Lessons */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ders Bazlı İlerleme Grafiği</h3>
              <div className="space-y-4">
                {(() => {
                  // Group assignments by lesson
                  const lessonGroups = assignmentsWithDetails.reduce((groups, assignment) => {
                    if (!assignment) return groups
                    const lessonId = assignment.lesson.id
                    if (!groups[lessonId]) {
                      groups[lessonId] = {
                        lesson: assignment.lesson,
                        assignments: []
                      }
                    }
                    groups[lessonId].assignments.push(assignment)
                    return groups
                  }, {} as Record<string, { lesson: any, assignments: any[] }>)

                  return Object.values(lessonGroups).map((group) => {
                    // Calculate lesson totals
                    const lessonTotalTarget = group.assignments.reduce((total, assignment) => {
                      const topicResources = getResourcesForTopic(assignment.topicId)
                      const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                      return total + topicResources.reduce((sum, resource) => {
                        const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                        const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                        return sum + studentCount
                      }, 0)
                    }, 0)

                    const lessonTotalCompleted = group.assignments.reduce((total, assignment) => {
                      const topicResources = getResourcesForTopic(assignment.topicId)
                      return total + topicResources.reduce((sum, resource) => {
                        const progressRecord = progressData.find(progress => 
                          progress.resourceId === resource.id && 
                          progress.assignmentId === assignment.id
                        )
                        return sum + (progressRecord?.solvedCount || 0)
                      }, 0)
                    }, 0)

                    const lessonProgressPercentage = lessonTotalTarget > 0 ? Math.round((lessonTotalCompleted / lessonTotalTarget) * 100) : 0

                    return (
                      <div key={group.lesson.id} className="border border-gray-200 rounded-lg">
                        {/* Lesson Header */}
                        <div className="p-4 border-b border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <button
                                onClick={() => toggleLessonExpansion(group.lesson.id)}
                                className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {expandedLessons.has(group.lesson.id) ? '▼' : '▶'}
                              </button>
                              <div className="flex items-center mr-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                                  {group.lesson.group}
                                </span>
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {group.lesson.name}
                                </h4>
            </div>
              </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Konular</div>
                                <div className="font-bold text-gray-900">{group.assignments.length}</div>
              </div>
                              <div className="text-center">
                                <div className="text-xs text-blue-600">Hedef</div>
                                <div className="font-bold text-blue-700">{lessonTotalTarget}</div>
              </div>
                              <div className="text-center">
                                <div className="text-xs text-green-600">Çözülen</div>
                                <div className="font-bold text-green-700">{lessonTotalCompleted}</div>
              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">İlerleme</div>
                                <div className="font-bold text-gray-900">{lessonProgressPercentage}%</div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${lessonProgressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Topics */}
                        {expandedLessons.has(group.lesson.id) && (
                          <div className="p-4 bg-gray-50">
                            <div className="space-y-3">
                              {group.assignments.map((assignment) => {
                                const topicResources = getResourcesForTopic(assignment.topicId)
                                
                                const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                                const totalStudentQuestions = topicResources.reduce((sum, resource) => {
                                  const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                                  const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                                  return sum + studentCount
                                }, 0)
                                
                                const completedQuestions = topicResources.reduce((sum, resource) => {
                                  const progressRecord = progressData.find(progress => 
                                    progress.resourceId === resource.id && 
                                    progress.assignmentId === assignment.id
                                  )
                                  return sum + (progressRecord?.solvedCount || 0)
                                }, 0)
                                
                                const progressPercentage = totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0
                                
                                return (
                                  <div key={assignment.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-3">
                                          {assignment.topic.order}
                                        </span>
                                        <h5 className="text-sm font-medium text-gray-900">
                                          {assignment.topic.name}
                                        </h5>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm">
                                        <span className="text-blue-600 font-medium">{completedQuestions}/{totalStudentQuestions}</span>
                                        <span className="text-gray-500">{progressPercentage}%</span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercentage}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
              </div>
            )}
            </div>
                    )
                  })
                })()}
          </div>
        </div>

        {/* Assigned Topics Dashboard */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Atanmış Konular Dashboard</h2>
            <button
              onClick={() => {
                setShowAssignmentModule(!showAssignmentModule)
                // Scroll to assignment module when opening
                if (!showAssignmentModule) {
                  setTimeout(() => {
                    const moduleElement = document.getElementById('topic-assignment-module')
                    if (moduleElement) {
                      moduleElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <span className="mr-2">{showAssignmentModule ? '−' : '+'}</span>
              {showAssignmentModule ? 'Modülü Gizle' : 'Yeni Konu Ata'}
            </button>
          </div>
          
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
              <button
                onClick={() => {
                  setShowAssignmentModule(true)
                  // Scroll to assignment module
                  setTimeout(() => {
                    const moduleElement = document.getElementById('topic-assignment-module')
                    if (moduleElement) {
                      moduleElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                İlk Konuyu Ata
              </button>
            </div>
                 ) : (
                   <div className="space-y-4">
                     {assignmentsWithDetails.map((assignment) => {
                       if (!assignment) return null
                       const topicResources = getResourcesForTopic(assignment.topicId)
                       
                       // Calculate total questions from resources
                       const totalResourceQuestions = topicResources.reduce((sum, resource) => {
                         return sum + (resource.questionCount || 0)
                       }, 0)
                       
                       // Calculate student assigned questions from questionCounts
                       const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                       const totalStudentQuestions = topicResources.reduce((sum, resource) => {
                         const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                         const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                         return sum + studentCount
                       }, 0)
                       
                       // Calculate completed questions from real progress data
                       const completedQuestions = topicResources.reduce((sum, resource) => {
                         // Find progress record for this resource and assignment
                         const progressRecord = progressData.find(progress => 
                           progress.resourceId === resource.id && 
                           progress.assignmentId === assignment.id
                         )
                         return sum + (progressRecord?.solvedCount || 0)
                       }, 0)
                       
                       return (
                         <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                           {/* Compact Header */}
                           <div className="p-4 border-b border-gray-100">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center flex-1">
                                 <button
                                   onClick={() => toggleTopicExpansion(assignment.id)}
                                   className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
                                 >
                                   {expandedTopics.has(assignment.id) ? '▼' : '▶'}
                                 </button>
                                 <div className="flex items-center mr-4">
                                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                   {assignment.lesson.group}
                                 </span>
                                   <span className="text-xs text-gray-500">
                                     {assignment.lesson.name}
                                 </span>
                               </div>
                                 <div className="flex-1">
                                   <h3 className="text-lg font-bold text-gray-900">
                                 {assignment.topic.order}. {assignment.topic.name}
                               </h3>
                                 </div>
                               </div>
                               
                               {/* Compact Stats */}
                               <div className="flex items-center gap-4 text-sm">
                                 <div className="text-center">
                                   <div className="text-xs text-gray-500">Kaynak</div>
                                   <div className="font-bold text-gray-900">{topicResources.length}</div>
                                 </div>
                                 <div className="text-center">
                                   <div className="text-xs text-blue-600">Hedef</div>
                                   <div className="font-bold text-blue-700">{totalStudentQuestions}</div>
                                 </div>
                                 <div className="text-center">
                                   <div className="text-xs text-green-600">Çözülen</div>
                                   <div className="font-bold text-green-700">{completedQuestions}</div>
                                 </div>
                                 <div className="text-center">
                                   <div className="text-xs text-gray-500">İlerleme</div>
                                   <div className="font-bold text-gray-900">
                                     {totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0}%
                                   </div>
                                 </div>
                                 <div>
                                   <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                     assignment.completed 
                                       ? 'bg-green-100 text-green-800' 
                                       : 'bg-yellow-100 text-yellow-800'
                                   }`}>
                                     {assignment.completed ? '✅' : '⏳'}
                                   </span>
                                 </div>
                               </div>
                             </div>
                           </div>
                           
                           {/* Expanded Content */}
                           {expandedTopics.has(assignment.id) && (
                             <div className="p-4 bg-gray-50">
                               {/* Resource Details */}
                               {topicResources.length > 0 && (
                             <div className="mt-6 pt-4 border-t border-gray-200">
                               <h4 className="text-lg font-semibold text-gray-800 mb-4">📚 Kaynak Detayları</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {topicResources.map(resource => {
                                   const resourceQuestions = resource.questionCount || 0
                                   const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                                   const studentCount = Object.values(resourceCounts).reduce((sum, count) => sum + count, 0)
                                   
                                   // Find progress record for this specific resource and assignment
                                   const progressRecord = progressData.find(progress => 
                                     progress.resourceId === resource.id && 
                                     progress.assignmentId === assignment.id
                                   )
                                   const completedCount = progressRecord?.solvedCount || 0
                                   const progressPercentage = studentCount > 0 ? Math.round((completedCount / studentCount) * 100) : 0
                                   
                                   return (
                                     <div key={resource.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all duration-200">
                                       <div className="flex items-center justify-between mb-4">
                                         <h5 className="text-sm font-bold text-gray-800 truncate">
                                           {resource.name}
                                         </h5>
                                         <span className="text-xs text-gray-500">
                                           {resourceQuestions} soru
                                         </span>
                                       </div>
                                       
                                       {/* Resource Stats */}
                                       <div className="space-y-3">
                                         <div className="flex items-center justify-between">
                                           <span className="text-xs text-gray-600">📖 Kaynak:</span>
                                           <span className="text-sm font-bold text-gray-700">
                                             {resourceQuestions} Soru
                                           </span>
                                         </div>
                                         <div className="flex items-center justify-between">
                                           <span className="text-xs text-gray-600">🎯 Çözülmesi Gereken:</span>
                                           <span className="text-sm font-bold text-blue-600">
                                             {studentCount} Soru
                                           </span>
                                         </div>
                                         <div className="flex items-center justify-between">
                                           <span className="text-xs text-gray-600">✅ Çözülen:</span>
                                           <span className="text-sm font-bold text-green-600">
                                             {completedCount} Soru
                                           </span>
                                 </div>
                               </div>
                               
                               {/* Progress Bar */}
                                       <div className="mt-4">
                                 <div className="flex items-center justify-between mb-2">
                                           <span className="text-xs text-gray-600">İlerleme</span>
                                           <span className="text-xs font-bold text-gray-700">{progressPercentage}%</span>
                                 </div>
                                         <div className="w-full bg-gray-200 rounded-full h-2">
                                           <div 
                                             className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                             style={{ width: `${progressPercentage}%` }}
                                   ></div>
                                 </div>
                               </div>
                               
                                       {/* Action Button */}
                                       <div className="mt-4 pt-3 border-t border-gray-200">
                                         <button
                                           onClick={() => incrementProgress(assignment.id, resource.id, assignment.topicId)}
                                           className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                           disabled={completedCount >= studentCount}
                                         >
                                           <span>+</span>
                                           <span>{completedCount >= studentCount ? 'Tamamlandı' : 'Soru Çözdüm'}</span>
                                         </button>
                                       </div>
                                       
                                       {/* Summary */}
                                       <div className="mt-2">
                                         <div className="text-xs text-center text-gray-600 font-medium">
                                           {resourceQuestions} kaynak / {studentCount} hedef / {completedCount} çözülen
                                         </div>
                                       </div>
                                     </div>
                                   )
                                 })}
                               </div>
                             </div>
                           )}
                             </div>
                           )}
                         </div>
                       )
                     })}
                   </div>
                 )}
            </div>
          </>
        )}

        {activeTab === 'topic-tracking' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Konu Takip</h2>
                  <p className="text-gray-600 mt-1">Atanan konuların detaylı takibi ve yönetimi</p>
                </div>
                <button
                  onClick={() => setShowAssignmentModule(!showAssignmentModule)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                >
                  <span className="mr-2">{showAssignmentModule ? '−' : '+'}</span>
                  {showAssignmentModule ? 'Modülü Gizle' : 'Yeni Konu Ata'}
                </button>
              </div>
              
              {assignments.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📚</div>
                  <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
                  <p className="text-gray-400 text-sm mb-6">
                    Öğrenciye konu atayarak takibe başlayın.
                  </p>
                  <button
                    onClick={() => setShowAssignmentModule(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    İlk Konuyu Ata
                  </button>
                </div>
              )}
            </div>

            {/* Assigned Topics List */}
            {assignments.length > 0 && (
              <div className="space-y-4">
                {assignmentsWithDetails.map((assignment) => {
                  if (!assignment) return null
                  const topicResources = getResourcesForTopic(assignment.topicId)
                  
                  // Calculate student assigned questions from questionCounts
                  const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
                  const totalStudentQuestions = topicResources.reduce((sum, resource) => {
                    const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                    const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
                    return sum + studentCount
                  }, 0)
                  
                  // Calculate completed questions from real progress data
                  const completedQuestions = topicResources.reduce((sum, resource) => {
                    const progressRecord = progressData.find(progress => 
                      progress.resourceId === resource.id && 
                      progress.assignmentId === assignment.id
                    )
                    return sum + (progressRecord?.solvedCount || 0)
                  }, 0)
                  
                  return (
                    <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                      {/* Compact Header */}
                      <div className="p-4 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <button
                              onClick={() => toggleTopicExpansion(assignment.id)}
                              className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {expandedTopics.has(assignment.id) ? '▼' : '▶'}
                            </button>
                            <div className="flex items-center mr-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                                {assignment.lesson.group}
                              </span>
                              <span className="text-xs text-gray-500">
                                {assignment.lesson.name}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900">
                                {assignment.topic.order}. {assignment.topic.name}
                              </h3>
                            </div>
                          </div>
                          
                          {/* Compact Stats */}
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-xs text-gray-500">Kaynak</div>
                              <div className="font-bold text-gray-900">{topicResources.length}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-blue-600">Hedef</div>
                              <div className="font-bold text-blue-700">{totalStudentQuestions}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-green-600">Çözülen</div>
                              <div className="font-bold text-green-700">{completedQuestions}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500">İlerleme</div>
                              <div className="font-bold text-gray-900">
                                {totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0}%
                              </div>
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                   assignment.completed 
                                     ? 'bg-green-100 text-green-800' 
                                     : 'bg-yellow-100 text-yellow-800'
                                 }`}>
                                {assignment.completed ? '✅' : '⏳'}
                                 </span>
                            </div>
                               </div>
                             </div>
                           </div>
                           
                      {/* Expanded Content */}
                      {expandedTopics.has(assignment.id) && (
                        <div className="p-4 bg-gray-50">
                           {/* Resource Details */}
                           {topicResources.length > 0 && (
                             <div className="mt-6 pt-4 border-t border-gray-200">
                               <h4 className="text-lg font-semibold text-gray-800 mb-4">📚 Kaynak Detayları</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {topicResources.map(resource => {
                                  const resourceQuestions = resource.questionCount || 0
                                  const resourceCounts = assignmentQuestionCounts[resource.id] || {}
                                  const studentCount = Object.values(resourceCounts).reduce((sum, count) => sum + count, 0)
                                  
                                  // Find progress record for this specific resource and assignment
                                  const progressRecord = progressData.find(progress => 
                                    progress.resourceId === resource.id && 
                                    progress.assignmentId === assignment.id
                                  )
                                  const completedCount = progressRecord?.solvedCount || 0
                                   const progressPercentage = studentCount > 0 ? Math.round((completedCount / studentCount) * 100) : 0
                                   
                                   return (
                                     <div key={resource.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all duration-200">
                                       <div className="flex items-center justify-between mb-4">
                                         <h5 className="text-sm font-bold text-gray-800 truncate">
                                           {resource.name}
                                         </h5>
                                         <span className="text-xs text-gray-500">
                                          {resourceQuestions} soru
                                         </span>
                                       </div>
                                       
                                       {/* Resource Stats */}
                                       <div className="space-y-3">
                                         <div className="flex items-center justify-between">
                                           <span className="text-xs text-gray-600">📖 Kaynak:</span>
                                           <span className="text-sm font-bold text-gray-700">
                                            {resourceQuestions} Soru
                                           </span>
                                         </div>
                                         <div className="flex items-center justify-between">
                                           <span className="text-xs text-gray-600">🎯 Çözülmesi Gereken:</span>
                                           <span className="text-sm font-bold text-blue-600">
                                             {studentCount} Soru
                                           </span>
                                         </div>
                                         <div className="flex items-center justify-between">
                                           <span className="text-xs text-gray-600">✅ Çözülen:</span>
                                           <span className="text-sm font-bold text-green-600">
                                             {completedCount} Soru
                                           </span>
                                         </div>
                                       </div>
                                       
                                       {/* Progress Bar */}
                                       <div className="mt-4">
                                         <div className="flex items-center justify-between mb-2">
                                           <span className="text-xs text-gray-600">İlerleme</span>
                                           <span className="text-xs font-bold text-gray-700">{progressPercentage}%</span>
                                         </div>
                                         <div className="w-full bg-gray-200 rounded-full h-2">
                                           <div 
                                            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                                             style={{ width: `${progressPercentage}%` }}
                                           ></div>
                                         </div>
                                       </div>
                                       
                                      {/* Action Button */}
                                       <div className="mt-4 pt-3 border-t border-gray-200">
                                        <button
                                          onClick={() => incrementProgress(assignment.id, resource.id, assignment.topicId)}
                                          className="w-full bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                                          disabled={completedCount >= studentCount}
                                        >
                                          <span>+</span>
                                          <span>{completedCount >= studentCount ? 'Tamamlandı' : 'Soru Çözdüm'}</span>
                                        </button>
                                      </div>
                                      
                                      {/* Summary */}
                                      <div className="mt-2">
                                         <div className="text-xs text-center text-gray-600 font-medium">
                                          {resourceQuestions} kaynak / {studentCount} hedef / {completedCount} çözülen
                                         </div>
                                       </div>
                                     </div>
                                   )
                                 })}
                               </div>
                            </div>
                          )}
                             </div>
                           )}
                         </div>
                       )
                     })}
                   </div>
                 )}
        </div>
        )}

        {activeTab === 'schedule' && (
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
                  {weeklySchedules.length > 0 && (
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
                  <button
                    onClick={() => setActiveTab('topic-tracking')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Konu Takip Tabına Git
                  </button>
                </div>
              )}
              
              {assignments.length > 0 && weeklySchedules.length === 0 && (
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
                        <div className="flex items-center gap-4">
                          {/* View Mode Filter */}
                          <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                              onClick={() => setViewMode('monthly')}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                                viewMode === 'monthly'
                                  ? 'bg-white text-blue-600 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              📅 Aylık
                            </button>
                            <button
                              onClick={() => setViewMode('weekly')}
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
                                onClick={goToPreviousMonth}
                                disabled={!activeSchedule || currentMonthOffset === 0}
                                className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ← Önceki Ay
                              </button>
                              <button
                                onClick={goToCurrentMonth}
                                disabled={!activeSchedule}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                📅 Bugün
                              </button>
                              <button
                                onClick={goToNextMonth}
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
                  
                  {/* 4-Week Grid with Drag & Drop */}
                  <div className="p-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {activeSchedule.weekPlans.slice(currentMonthOffset * 4, (currentMonthOffset + 1) * 4).map((week: any, weekIndex: number) => {
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
                      const lessonColor = getLessonColor(topic.assignment.topic.lesson.name)
                      const colorClasses = {
                        blue: 'bg-blue-50 border-blue-200 text-blue-800',
                        purple: 'bg-purple-50 border-purple-200 text-purple-800',
                        green: 'bg-green-50 border-green-200 text-green-800',
                        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
                        orange: 'bg-orange-50 border-orange-200 text-orange-800',
                        red: 'bg-red-50 border-red-200 text-red-800',
                        gray: 'bg-gray-50 border-gray-200 text-gray-800'
                      }
                      return (
                        <div key={topic.id} className={`flex items-center justify-between ${colorClasses[lessonColor as keyof typeof colorClasses]} border rounded-md p-2`}>
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
                      const lessonColor = getLessonColor(assignment.lesson.name)
                      const colorClasses = {
                        blue: 'bg-blue-50 border-blue-200 text-blue-800',
                        purple: 'bg-purple-50 border-purple-200 text-purple-800',
                        green: 'bg-green-50 border-green-200 text-green-800',
                        emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
                        orange: 'bg-orange-50 border-orange-200 text-orange-800',
                        red: 'bg-red-50 border-red-200 text-red-800',
                        gray: 'bg-gray-50 border-gray-200 text-gray-800'
                      }
                      return (
                        <div key={assignment.id} className={`flex items-center justify-between ${colorClasses[lessonColor as keyof typeof colorClasses]} border rounded-md p-2`}>
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
                  onClick={createWeeklySchedule}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Program Oluştur
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'student-info' && (
          <div className="space-y-6">
            {/* Student Information Header */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                <p className="text-gray-600 mt-1">Öğrenci Detay Bilgileri</p>
              </div>
            </div>

            {/* Detailed Student Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Kişisel Bilgiler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Ad Soyad</label>
                  <p className="text-gray-900">{student.name}</p>
                </div>
                {student.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">E-posta</label>
                    <p className="text-gray-900">{student.email}</p>
                  </div>
                )}
                {student.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Telefon</label>
                    <p className="text-gray-900">{student.phone}</p>
                  </div>
                )}
                {student.parentName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Veli Adı</label>
                    <p className="text-gray-900">{student.parentName}</p>
                  </div>
                )}
                {student.parentPhone && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Veli Telefonu</label>
                    <p className="text-gray-900">{student.parentPhone}</p>
                  </div>
                )}
                {student.notes && (
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="text-sm font-medium text-gray-500">Notlar</label>
                    <p className="text-gray-900">{student.notes}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Kayıt Tarihi</label>
                  <p className="text-gray-900">{new Date(student.createdAt).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topic Assignment Module */}
        {showAssignmentModule && (
          <div id="topic-assignment-module" className="mt-6">
            <TopicAssignmentModule
              studentId={studentId}
              onAssignmentComplete={() => {
                // Refresh assignments after successful assignment
                const fetchAssignments = async () => {
                  try {
                    const res = await fetch(`/api/student-assignments?studentId=${studentId}`)
                    if (res.ok) {
                      const data = await res.json()
                      setAssignments(data)
                    }
                  } catch (error) {
                    // Error handled silently in production
                  }
                }
                fetchAssignments()
                setShowAssignmentModule(false)
              }}
              showTitle={true}
            />
          </div>
        )}
      </div>
    </div>
  )
}
