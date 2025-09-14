'use client'

export default function StudentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
        <p className="mt-2 text-gray-600">
          Öğrenci bilgilerini yönetin ve takip edin.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Öğrenci Yönetimi</h3>
            <p className="mt-1 text-sm text-gray-500">Bu özellik yakında eklenecek.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
