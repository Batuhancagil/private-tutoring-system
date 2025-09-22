'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import TopicAssignmentModule from '@/components/TopicAssignmentModule'

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

interface Resource {
  id: string
  name: string
  description: string
  lessonIds: string[]
  questionCount: number
  createdAt: string
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
  const studentId = params.id as string
  
  const [student, setStudent] = useState<Student | null>(null)
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignmentModule, setShowAssignmentModule] = useState(false)

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

      } catch (err) {
        console.error('Error fetching student data:', err)
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
    console.log('getResourcesForTopic called with topicId:', topicId)
    console.log('Available resources:', resources.length)
    
    interface ResourceWithQuestionCount {
      id: string;
      name: string;
      description: string | null;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
      lessons: any[];
      questionCount: number;
      resourceTopicId: string;
    }
    
    const result: ResourceWithQuestionCount[] = []
    
    resources.forEach(resource => {
      console.log('Processing resource:', resource.name, 'lessons:', resource.lessons?.length)
      
      // Check if resource has lessons and it's an array
      if (!resource.lessons || !Array.isArray(resource.lessons)) {
        console.log('Resource has no lessons or not array:', resource.lessons)
        return
      }
      
      resource.lessons.forEach(resourceLesson => {
        console.log('Checking resource lesson:', resourceLesson.lesson?.name, 'topics:', resourceLesson.topics?.length)
        
        if (!resourceLesson.lesson || !resourceLesson.topics || !Array.isArray(resourceLesson.topics)) {
          console.log('Resource lesson or topics not found:', resourceLesson)
          return
        }
        
        resourceLesson.topics.forEach(resourceTopic => {
          if (resourceTopic.topic.id === topicId) {
            console.log('Found matching topic in resource:', resource.name, 'questionCount:', resourceTopic.questionCount)
            
            // Create a resource object with the questionCount from ResourceTopic
            const resourceWithQuestionCount: ResourceWithQuestionCount = {
              id: resource.id,
              name: resource.name,
              description: resource.description,
              userId: (resource as any).userId || 'demo-user-id',
              createdAt: new Date(resource.createdAt),
              updatedAt: (resource as any).updatedAt ? new Date((resource as any).updatedAt) : new Date(),
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
    
    console.log('Found resources for topic:', result.length, result.map(r => ({ name: r.name, questionCount: r.questionCount })))
    return result
  }

  // Calculate statistics
  const totalAssignedTopics = assignments.length
  const completedTopics = assignments.filter(a => a.completed).length
  const completionRate = totalAssignedTopics > 0 ? Math.round((completedTopics / totalAssignedTopics) * 100) : 0

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
            onClick={() => window.close()}
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
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-gray-600 mt-1">Öğrenci Dashboard</p>
            </div>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Kapat
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">📚</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Atanan Konu</p>
                <p className="text-2xl font-semibold text-gray-900">{totalAssignedTopics}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-600 font-semibold">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tamamlanan Konu</p>
                <p className="text-2xl font-semibold text-gray-900">{completedTopics}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tamamlanma Oranı</p>
                <p className="text-2xl font-semibold text-gray-900">{completionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                  <span className="text-orange-600 font-semibold">❓</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Soru Sayısı</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {assignmentsWithDetails.reduce((total, assignment) => {
                    if (!assignment) return total
                    const topicResources = getResourcesForTopic(assignment.topicId)
                    return total + topicResources.reduce((sum, resource) => {
                      // Geçici olarak rastgele soru sayısı (questionCounts henüz yok)
                      return sum + Math.floor(Math.random() * resource.questionCount) + 1
                    }, 0)
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Student Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Öğrenci Bilgileri</h2>
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
                       const assignmentQuestionCounts = assignment.questionCounts || {}
                       const totalStudentQuestions = topicResources.reduce((sum, resource) => {
                         const studentCount = assignmentQuestionCounts[resource.id] || 0
                         return sum + studentCount
                       }, 0)
                       
                       // Calculate completed questions (temporary random for now)
                       const completedQuestions = totalStudentQuestions > 0 ? Math.floor(Math.random() * totalStudentQuestions) : 0
                       
                       return (
                         <div key={assignment.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                           {/* Header */}
                           <div className="flex items-start justify-between mb-4">
                             <div className="flex-1">
                               <div className="flex items-center mb-3">
                                 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-3">
                                   {assignment.lesson.group}
                                 </span>
                                 <span className="text-sm text-gray-500">
                                   {assignment.lesson.name} - {assignment.lesson.subject}
                                 </span>
                               </div>
                               <h3 className="text-xl font-bold text-gray-900 mb-3">
                                 {assignment.topic.order}. {assignment.topic.name}
                               </h3>
                               
                               {/* Mini Dashboard Stats */}
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                 <div className="bg-gray-50 rounded-lg p-3">
                                   <div className="text-xs text-gray-500 mb-1">Toplam Kaynak</div>
                                   <div className="text-lg font-bold text-gray-900">{topicResources.length}</div>
                                 </div>
                                 <div className="bg-orange-50 rounded-lg p-3">
                                   <div className="text-xs text-orange-600 mb-1">Kaynak Soruları</div>
                                   <div className="text-lg font-bold text-orange-700">{totalResourceQuestions}</div>
                                 </div>
                                 <div className="bg-blue-50 rounded-lg p-3">
                                   <div className="text-xs text-blue-600 mb-1">Çözülmesi Gereken</div>
                                   <div className="text-lg font-bold text-blue-700">{totalStudentQuestions}</div>
                                 </div>
                                 <div className="bg-green-50 rounded-lg p-3">
                                   <div className="text-xs text-green-600 mb-1">Çözülen</div>
                                   <div className="text-lg font-bold text-green-700">{completedQuestions}</div>
                                 </div>
                               </div>
                               
                               {/* Progress Bar */}
                               <div className="mb-4">
                                 <div className="flex items-center justify-between mb-2">
                                   <span className="text-sm font-medium text-gray-700">İlerleme</span>
                                   <span className="text-sm font-bold text-gray-900">
                                     {totalStudentQuestions > 0 ? Math.round((completedQuestions / totalStudentQuestions) * 100) : 0}%
                                   </span>
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-3">
                                   <div 
                                     className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                                     style={{ 
                                       width: `${totalStudentQuestions > 0 ? Math.min((completedQuestions / totalStudentQuestions) * 100, 100) : 0}%` 
                                     }}
                                   ></div>
                                 </div>
                               </div>
                               
                               {/* Status Badge */}
                               <div className="flex items-center gap-2">
                                 <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                   assignment.completed 
                                     ? 'bg-green-100 text-green-800' 
                                     : 'bg-yellow-100 text-yellow-800'
                                 }`}>
                                   {assignment.completed ? '✅ Tamamlandı' : '⏳ Devam Ediyor'}
                                 </span>
                                 <span className="text-sm text-gray-500">
                                   {completedQuestions} / {totalStudentQuestions} soru çözüldü
                                 </span>
                               </div>
                             </div>
                           </div>
                           
                           {/* Resource Details */}
                           {topicResources.length > 0 && (
                             <div className="mt-6 pt-4 border-t border-gray-200">
                               <h4 className="text-lg font-semibold text-gray-800 mb-4">📚 Kaynak Detayları</h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {topicResources.map(resource => {
                                   const resourceQuestions = resource.questionCount || 0
                                   const studentCount = assignmentQuestionCounts[resource.id] || 0
                                   const completedCount = studentCount > 0 ? Math.floor(Math.random() * studentCount) : 0
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
                                       
                                       {/* Summary */}
                                       <div className="mt-4 pt-3 border-t border-gray-200">
                                         <div className="text-xs text-center text-gray-600 font-medium">
                                           {resource.name} - {resourceQuestions} / {studentCount} / {completedCount}
                                         </div>
                                       </div>
                                     </div>
                                   )
                                 })}
                               </div>
                             </div>
                           )}
                         </div>
                       )
                     })}
                   </div>
                 )}
        </div>

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
                    console.error('Failed to fetch assignments:', error)
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
