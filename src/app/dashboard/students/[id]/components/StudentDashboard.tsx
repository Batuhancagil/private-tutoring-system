'use client'

import ProgressCard from './shared/ProgressCard'

interface StudentDashboardProps {
  student: {
    name: string
  }
  assignments: any[]
  progressData: any[]
  getResourcesForTopic: (topicId: string) => any[]
}

export default function StudentDashboard({ 
  student, 
  assignments, 
  progressData, 
  getResourcesForTopic 
}: StudentDashboardProps) {
  
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
        </div>
        
        {/* Duplicate metrics for consistency */}
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
    </div>
  )
}
