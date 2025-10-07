'use client'

interface TopicCardProps {
  topic: {
    id: string
    name: string
    order: number
  }
  lesson: {
    id: string
    name: string
    group: string
  }
  progress: {
    completed: number
    total: number
    percentage: number
  }
  isExpanded: boolean
  onToggleExpansion: () => void
  children?: React.ReactNode
}

export default function TopicCard({ 
  topic, 
  lesson, 
  progress, 
  isExpanded, 
  onToggleExpansion,
  children 
}: TopicCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <button
              onClick={onToggleExpansion}
              className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
            <div className="flex items-center mr-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                {lesson.group}
              </span>
              <span className="text-xs text-gray-500">
                {lesson.name}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">
                {topic.order}. {topic.name}
              </h3>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-xs text-blue-600">Hedef</div>
              <div className="font-bold text-blue-700">{progress.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-green-600">Çözülen</div>
              <div className="font-bold text-green-700">{progress.completed}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">İlerleme</div>
              <div className="font-bold text-gray-900">{progress.percentage}%</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && children && (
        <div className="p-4 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  )
}
