'use client'

interface ProgressCardProps {
  title: string
  value: string | number
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
  description?: string
}

export default function ProgressCard({ title, value, icon, color, description }: ProgressCardProps) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-800',
    green: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-800',
    purple: 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-800',
    orange: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-800'
  }

  const iconColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400'
  }

  return (
    <div className={`rounded-xl p-6 border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && <p className="text-xs opacity-75 mt-1">{description}</p>}
        </div>
        <div className={`text-3xl ${iconColors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}
