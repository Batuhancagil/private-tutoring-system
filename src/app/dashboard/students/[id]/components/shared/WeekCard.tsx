'use client'

interface WeekCardProps {
  week: {
    id: string
    weekNumber: number
    startDate: string
    endDate: string
    weekTopics: Array<{
      id: string
      assignment: {
        topic: {
          id: string
          name: string
          order: number
          lesson: {
            name: string
          }
        }
      }
    }>
  }
  onEdit: () => void
  isMonthlyView?: boolean
}

export default function WeekCard({ week, onEdit, isMonthlyView = true }: WeekCardProps) {
  const weekStart = new Date(week.startDate)
  const weekEnd = new Date(week.endDate)
  const weekTopics = week.weekTopics || []

  if (isMonthlyView) {
    return (
      <div className="border border-gray-200 rounded-lg p-3">
        <div className="text-center mb-3">
          <h4 className="text-sm font-medium text-gray-800">
            Hafta {week.weekNumber}
          </h4>
          <p className="text-xs text-gray-500">
            {weekStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </p>
          <button
            onClick={onEdit}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            ✏️ Düzenle
          </button>
        </div>
        
        {/* Week Topics */}
        <div className="space-y-2">
          {weekTopics.length > 0 ? (
            weekTopics.map((weekTopic) => (
              <div key={weekTopic.id} className="bg-gray-50 border border-gray-200 rounded-md p-2">
                <div className="text-xs font-medium text-gray-800">
                  {weekTopic.assignment.topic.order}. {weekTopic.assignment.topic.name}
                </div>
                <div className="text-xs opacity-75">
                  {weekTopic.assignment.topic.lesson.name}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-300 text-2xl mb-2">📅</div>
              <p className="text-xs text-gray-500">Bu hafta için konu atanmamış</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Weekly View
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-lg font-medium text-gray-800">
            Hafta {week.weekNumber}
          </h4>
          <p className="text-sm text-gray-500">
            {weekStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - {weekEnd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 rounded-md"
        >
          ✏️ Düzenle
        </button>
      </div>
      
      {/* Week Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {weekTopics.length > 0 ? (
          weekTopics.map((weekTopic) => (
            <div key={weekTopic.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-medium text-gray-800">
                    {weekTopic.assignment.topic.order}. {weekTopic.assignment.topic.name}
                  </h5>
                  <p className="text-xs text-gray-500">
                    {weekTopic.assignment.topic.lesson.name}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <span className="text-2xl">📚</span>
            <p className="mt-2">Bu hafta için konu atanmamış</p>
          </div>
        )}
      </div>
    </div>
  )
}
