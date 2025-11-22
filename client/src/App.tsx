import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import DoodleBackground from '@/components/DoodleBackground'
import LoadingButterfly from '@/components/LoadingButterfly'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicRoute from '@/components/PublicRoute'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { queryClient } from '@/lib/query-client'
import { initializeAuth } from '@/stores/authStore'
import { Analytics } from '@vercel/analytics/react';

// Layouts
const Layout = lazy(() => import('./components/Layout'))

// Pages
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Projects = lazy(() => import('./pages/projects/Projects'))
const CreateProject = lazy(() => import('./pages/projects/CreateProject'))
const EditProject = lazy(() => import('./pages/projects/EditProject'))
const Centers = lazy(() => import('./pages/centers/Centers'))
const CreateCenter = lazy(() => import('./pages/centers/CreateCenter'))
const EditCenter = lazy(() => import('./pages/centers/EditCenter'))
const Semesters = lazy(() => import('./pages/semesters/Semesters'))
const CreateSemester = lazy(() => import('./pages/semesters/CreateSemester'))
const EditSemester = lazy(() => import('./pages/semesters/EditSemester'))
const Dashboard = lazy(() => import('./pages/semesters/Dashboard'))
const Students = lazy(() => import('./pages/students/Students'))
const CreateStudent = lazy(() => import('./pages/students/CreateStudent'))
const EditStudent = lazy(() => import('./pages/students/EditStudent'))
const ViewAttendance = lazy(() => import('./pages/attendance/ViewAttendance').then(module => ({ default: module.ViewAttendance })))
const MarkAttendance = lazy(() => import('./pages/attendance/MarkAttendance').then(module => ({ default: module.MarkAttendance })))
const Renumeration = lazy(() => import('./pages/attendance/Renumeration').then(module => ({ default: module.Renumeration })))
const ViewStudentAttendance = lazy(() => import('./pages/student-attendance/ViewStudentAttendance').then(module => ({ default: module.ViewStudentAttendance })))
const MarkStudentAttendance = lazy(() => import('./pages/student-attendance/MarkStudentAttendance').then(module => ({ default: module.MarkStudentAttendance })))
const SyllabusManagement = lazy(() => import('./pages/syllabus').then(module => ({ default: module.SyllabusManagement })))
const CreateSyllabus = lazy(() => import('./pages/syllabus').then(module => ({ default: module.CreateSyllabus })))
const EditSyllabus = lazy(() => import('./pages/syllabus').then(module => ({ default: module.EditSyllabus })))
const SyllabusProgress = lazy(() => import('./pages/syllabus').then(module => ({ default: module.SyllabusProgress })))
const ExamManagement = lazy(() => import('./pages/exams').then(module => ({ default: module.ExamManagement })))
const CreateExam = lazy(() => import('./pages/exams').then(module => ({ default: module.CreateExam })))
const EditExam = lazy(() => import('./pages/exams').then(module => ({ default: module.EditExam })))
const ExamScores = lazy(() => import('./pages/exams').then(module => ({ default: module.ExamScores })))
const RegistrationRequests = lazy(() => import('./pages/RegistrationRequests'))
const Users = lazy(() => import('./pages/users/Users'))
const UserDetails = lazy(() => import('./pages/users/UserDetails'))
const EditUser = lazy(() => import('./pages/users/EditUser'))
const Profile = lazy(() => import('./pages/Profile'))
const BankDetails = lazy(() => import('./pages/BankDetails'))
const Library = lazy(() => import('./pages/library/Library'))
const BookReader = lazy(() => import('./pages/library/BookReader'))


// Loading fallback component
const PageLoading = () => (
  <div className="min-h-[100dvh] w-full bg-background overflow-hidden relative flex items-center justify-center">
    <DoodleBackground numElements={10} />
    <div className="relative z-10">
      <LoadingButterfly size="md" />
    </div>
  </div>
)

function App() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <>
      <Analytics />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Public routes - redirect to /projects if authenticated */}
              <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

              {/* Protected routes with layout */}
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Projects />} />
                <Route path="new" element={<CreateProject />} />
                <Route path=":id/edit" element={<EditProject />} />
                <Route path=":projectId/centers" element={<Centers />} />
                <Route path=":projectId/centers/new" element={<CreateCenter />} />
                <Route path=":projectId/centers/:id/edit" element={<EditCenter />} />
                <Route path=":projectId/centers/:centerId/semesters" element={<Semesters />} />
                <Route path=":projectId/centers/:centerId/semesters/new" element={<CreateSemester />} />
                <Route path=":projectId/centers/:centerId/semesters/:id/edit" element={<EditSemester />} />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard" element={<Dashboard />} />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/students"
                  element={
                    <ProtectedRoute allowAll={true}>
                      <Students />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/students/new"
                  element={
                    <ProtectedRoute allowedSubRoles={['CENTER_MANAGER']}>
                      <CreateStudent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/students/:id/edit"
                  element={
                    <ProtectedRoute allowedSubRoles={['CENTER_MANAGER']}>
                      <EditStudent />
                    </ProtectedRoute>
                  }
                />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/view" element={
                  <ProtectedRoute allowedSubRoles={['CENTER_MANAGER']}>
                    <ViewAttendance />
                  </ProtectedRoute>
                } />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/mark" element={
                  <ProtectedRoute allowedSubRoles={['CENTER_MANAGER']}>
                    <MarkAttendance />
                  </ProtectedRoute>
                } />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/renumeration" element={
                  <ProtectedRoute allowedSubRoles={['CENTER_MANAGER']}>
                    <Renumeration />
                  </ProtectedRoute>
                } />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/bank-details"
                  element={
                    <ProtectedRoute allowAll={true}>
                      <BankDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/student-attendance/view"
                  element={
                    <ProtectedRoute allowedSubRoles={['EDUCATOR', 'CENTER_MANAGER']}>
                      <ViewStudentAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/student-attendance/mark"
                  element={
                    <ProtectedRoute allowedSubRoles={['EDUCATOR', 'CENTER_MANAGER']}>
                      <MarkStudentAttendance />
                    </ProtectedRoute>
                  }
                />
                {/* Syllabus Routes */}
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus"
                  element={
                    <ProtectedRoute allowAll={true}>
                      <SyllabusManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus/create"
                  element={
                    <ProtectedRoute allowedSubRoles={['CURRICULUM_MENTOR']}>
                      <CreateSyllabus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus/:syllabusId/edit"
                  element={
                    <ProtectedRoute allowedSubRoles={['CURRICULUM_MENTOR']}>
                      <EditSyllabus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus/:syllabusId/progress"
                  element={
                    <ProtectedRoute allowAll={true}>
                      <SyllabusProgress />
                    </ProtectedRoute>
                  }
                />
                {/* Exam Routes */}
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams"
                  element={
                    <ProtectedRoute>
                      <ExamManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams/create"
                  element={
                    <ProtectedRoute allowedSubRoles={['CENTER_MANAGER', 'CURRICULUM_MENTOR']}>
                      <CreateExam />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams/:examId/edit"
                  element={
                    <ProtectedRoute allowedSubRoles={['CENTER_MANAGER', 'CURRICULUM_MENTOR']}>
                      <EditExam />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams/:examId/scores"
                  element={
                    <ProtectedRoute>
                      <ExamScores />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Profile />} />
                <Route path="bank" element={<BankDetails />} />
              </Route>

              <Route
                path="/registration-requests"
                element={
                  <ProtectedRoute requireAdmin>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<RegistrationRequests />} />
              </Route>

              <Route
                path="/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Users />} />
                <Route path=":userId/details" element={<UserDetails />} />
                <Route path=":userId/edit" element={<EditUser />} />
              </Route>

              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Library />} />
              </Route>

              <Route
                path="/library/:bookId"
                element={
                  <ProtectedRoute>
                    <BookReader />
                  </ProtectedRoute>
                }
              />

              {/* Redirect any unmatched routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        {/* Toast notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#ffffff',
              color: '#333333',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              padding: '12px 16px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#f97316',
                secondary: '#ffffff',
              },
            },
          }}
        />

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />} */}
      </QueryClientProvider>
    </>
  )
}

export default App
