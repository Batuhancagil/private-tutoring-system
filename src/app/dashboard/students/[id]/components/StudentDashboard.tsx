'use client'

import { useRouter } from 'next/navigation'
import ProgressCard from './shared/ProgressCard'
import LessonProgressChart from './shared/LessonProgressChart'
import { Student, AssignmentWithDetails, ProgressData, Resource } from '../types'

interface StudentDashboardProps {
  student: Student
  assignments: AssignmentWithDetails[]
  progressData: ProgressData[]
  getResourcesForTopic: (topicId: string) => Resource[]
  showAssignmentModule: boolean
  onToggleAssignmentModule: () => void
}

export default function StudentDashboard({ 
  student, 
  assignments, 
  progressData, 
  getResourcesForTopic,
  showAssignmentModule,
  onToggleAssignmentModule
}: StudentDashboardProps) {
  const router = useRouter()
  
  // Calculate dashboard metrics
  const totalAssignedTopics = assignments.length
  
  const totalTargetQuestions = assignments.reduce((total, assignment) => {
    const topicResources = getResourcesForTopic(assignment.topicId)
    const assignmentQuestionCounts = assignment.questionCounts as Record<string, Record<string, number>> || {}
    return total + topicResources.reduce((sum, resource) => {
      const resourceCounts = assignmentQuestionCounts[resource.id] || {}
      const studentCount = Object.values(resourceCounts).reduce((resSum, count) => resSum + count, 0)
      return sum + studentCount
    }, 0)
  }, 0)

  const totalCompletedQuestions = assignments.reduce((total, assignment) => {
    const topicResources = getResourcesForTopic(assignment.topicId)
    return total + topicResources.reduce((sum, resource) => {
      const progressRecord = progressData.find(progress => 
        progress.resourceId === resource.id && 
        progress.assignmentId === assignment.id
      )
      return sum + (progressRecord?.solvedCount || 0)
    }, 0)
  }, 0)

  const overallProgress = totalTargetQuestions > 0 ? Math.round((totalCompletedQuestions / totalTargetQuestions) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Dashboard Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Genel İlerleme Özeti</h2>
          <p className="text-gray-600 mt-1">Öğrencinin genel performans durumu</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProgressCard
            title="Toplam Atanan Konu"
            value={totalAssignedTopics}
            icon="📚"
            color="blue"
          />
          <ProgressCard
            title="Toplam Hedef Soru"
            value={totalTargetQuestions}
            icon="🎯"
            color="green"
          />
          <ProgressCard
            title="Çözülen Soru"
            value={totalCompletedQuestions}
            icon="✅"
            color="purple"
          />
          <ProgressCard
            title="Genel İlerleme"
            value={`${overallProgress}%`}
            icon="📈"
            color="orange"
          />
        </div>
      </div>

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
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ProgressCard
            title="Toplam Atanan Konu"
            value={totalAssignedTopics}
            icon="📚"
            color="blue"
          />
          <ProgressCard
            title="Toplam Hedef Soru"
            value={totalTargetQuestions}
            icon="🎯"
            color="green"
          />
          <ProgressCard
            title="Çözülen Soru"
            value={totalCompletedQuestions}
            icon="✅"
            color="purple"
          />
          <ProgressCard
            title="Genel İlerleme"
            value={`${overallProgress}%`}
            icon="📈"
            color="orange"
          />
        </div>
      </div>

      {/* Lesson Progress Chart */}
      <LessonProgressChart
        assignments={assignments}
        progressData={progressData}
        getResourcesForTopic={getResourcesForTopic}
      />

      {/* Assigned Topics Dashboard */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Atanmış Konular Dashboard</h2>
          <button
            onClick={onToggleAssignmentModule}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <span className="mr-2">{showAssignmentModule ? '−' : '+'}</span>
            {showAssignmentModule ? 'Modülü Gizle' : 'Yeni Konu Ata'}
          </button>
        </div>
        
        {assignments.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg mb-4">Henüz konu atanmamış</p>
            <button
              onClick={onToggleAssignmentModule}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              İlk Konuyu Ata
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
