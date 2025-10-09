'use client'

import { Student } from '../types'

interface StudentInfoProps {
  student: Student
}

export default function StudentInfo({ student }: StudentInfoProps) {
  return (
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
  )
}
