'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isCurriculumOpen, setIsCurriculumOpen] = useState(false)
  const [isStudentOpen, setIsStudentOpen] = useState(false)
  const [isTeacherOpen, setIsTeacherOpen] = useState(false)
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Dropdown'ları otomatik aç
  useEffect(() => {
    if (pathname === '/dashboard/lessons' || pathname === '/dashboard/resources') {
      setIsCurriculumOpen(true)
    }
    if (pathname === '/dashboard/students' || pathname === '/dashboard/student-assignments') {
      setIsStudentOpen(true)
    }
    if (pathname === '/dashboard/teacher-management') {
      setIsTeacherOpen(true)
    }
    if (pathname === '/dashboard/super-admin') {
      setIsSuperAdminOpen(true)
    }
  }, [pathname])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Öğretmen Paneli
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/student/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                👨‍🎓 Öğrenci Girişi
              </Link>
              <span className="text-sm text-gray-700">
                Hoş geldiniz, {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-5 px-2">
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  pathname === '/dashboard' 
                    ? 'text-gray-900 bg-gray-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
                Ana Sayfa
              </Link>
              {/* Müfredat Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsCurriculumOpen(!isCurriculumOpen)}
                  className={`group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === '/dashboard/lessons' || pathname === '/dashboard/resources'
                      ? 'text-gray-900 bg-gray-100' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Müfredat Yönetimi
                  </div>
                  <svg className={`h-4 w-4 transition-transform ${isCurriculumOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isCurriculumOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      href="/dashboard/lessons"
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        pathname === '/dashboard/lessons' 
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Ders Yönetimi
                    </Link>
                    <Link
                      href="/dashboard/resources"
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        pathname === '/dashboard/resources' 
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Kaynak Yönetimi
                    </Link>
                  </div>
                )}
              </div>
              {/* Öğrenci Yönetimi Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsStudentOpen(!isStudentOpen)}
                  className={`group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === '/dashboard/students' || pathname === '/dashboard/student-assignments'
                      ? 'text-gray-900 bg-gray-100' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Öğrenci Yönetimi
                  </div>
                  <svg className={`h-4 w-4 transition-transform ${isStudentOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isStudentOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      href="/dashboard/students"
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        pathname === '/dashboard/students' 
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Öğrenci Listesi
                    </Link>
                    <Link
                      href="/dashboard/student-assignments"
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                        pathname === '/dashboard/student-assignments' 
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Konu Ataması
                    </Link>
                  </div>
                )}
              </div>
              <Link
                href="/dashboard/schedule"
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  pathname === '/dashboard/schedule' 
                    ? 'text-gray-900 bg-gray-100' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Ders Programı
              </Link>
              
              {/* Teacher Profile - Only for Teachers */}
              {session.user?.role === 'TEACHER' && (
                <Link
                  href="/dashboard/teacher-profile"
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    pathname === '/dashboard/teacher-profile'
                      ? 'text-gray-900 bg-gray-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profil Ayarları
                </Link>
              )}

              {/* Super Admin Only Sections */}
              {session.user?.role === 'SUPER_ADMIN' && (
                <>
                  {/* Öğretmen Yönetimi Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsTeacherOpen(!isTeacherOpen)}
                      className={`group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md ${
                        pathname === '/dashboard/teacher-management'
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        Öğretmen Yönetimi
                      </div>
                      <svg className={`h-4 w-4 transition-transform ${isTeacherOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isTeacherOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        <Link
                          href="/dashboard/teacher-management"
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                            pathname === '/dashboard/teacher-management' 
                              ? 'text-gray-900 bg-gray-100' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Öğretmen Ekle
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  {/* Super Admin Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsSuperAdminOpen(!isSuperAdminOpen)}
                      className={`group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md ${
                        pathname === '/dashboard/super-admin'
                          ? 'text-gray-900 bg-gray-100' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Super Admin
                      </div>
                      <svg className={`h-4 w-4 transition-transform ${isSuperAdminOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isSuperAdminOpen && (
                      <div className="ml-4 mt-1 space-y-1">
                        <Link
                          href="/dashboard/super-admin"
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                            pathname === '/dashboard/super-admin' 
                              ? 'text-gray-900 bg-gray-100' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Hesap Ayarları
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
