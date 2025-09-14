'use client'

export default function SchedulePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ders Programı</h1>
        <p className="mt-2 text-gray-600">
          Haftalık ders programınızı görüntüleyin ve yönetin.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Ders Programı</h3>
            <p className="mt-1 text-sm text-gray-500">Bu özellik yakında eklenecek.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
