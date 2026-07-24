import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'react-hot-toast'
import DoodleBackground from '@/components/DoodleBackground'
import LoadingButterfly from '@/components/LoadingButterfly'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicRoute from '@/components/PublicRoute'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { ConfirmationModal } from '@/components/ui'
import { queryClient } from '@/lib/query-client'
import { initializeAuth } from '@/stores/authStore'

// Layouts
const Layout = lazy(() => import('./components/Layout'))
const NotFoundPage = lazy(() => import('./components/NotFoundPage'))

// Pages
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ActivateAccount = lazy(() => import('./pages/ActivateAccount'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AdministrationDashboard = lazy(() => import('./pages/AdministrationDashboard'))
const Projects = lazy(() => import('./pages/projects/Projects'))
const ProjectDashboard = lazy(() => import('./pages/projects/ProjectDashboard'))
const CreateProject = lazy(() => import('./pages/projects/CreateProject'))
const EditProject = lazy(() => import('./pages/projects/EditProject'))
const Centers = lazy(() => import('./pages/centers/Centers'))
const CenterDashboard = lazy(() => import('./pages/centers/CenterDashboard'))
const CreateCenter = lazy(() => import('./pages/centers/CreateCenter'))
const EditCenter = lazy(() => import('./pages/centers/EditCenter'))
const Semesters = lazy(() => import('./pages/semesters/Semesters'))
const CreateSemester = lazy(() => import('./pages/semesters/CreateSemester'))
const EditSemester = lazy(() => import('./pages/semesters/EditSemester'))
const SemesterSetup = lazy(() => import('./pages/semesters/SemesterSetup'))
const Dashboard = lazy(() => import('./pages/semesters/Dashboard'))
const SemesterUsers = lazy(() => import('./pages/semesters/SemesterUsers'))
const Students = lazy(() => import('./pages/students/Students'))
const CreateStudent = lazy(() => import('./pages/students/CreateStudent'))
const EditStudent = lazy(() => import('./pages/students/EditStudent'))
const ViewAttendance = lazy(() => import('./pages/attendance/ViewAttendance').then(module => ({ default: module.ViewAttendance })))
const MarkAttendance = lazy(() => import('./pages/attendance/MarkAttendance').then(module => ({ default: module.MarkAttendance })))
const Remuneration = lazy(() => import('./pages/attendance/Remuneration').then(module => ({ default: module.Remuneration })))
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
const Users = lazy(() => import('./pages/users/Users'))
const UserDetails = lazy(() => import('./pages/users/UserDetails'))
const EditUser = lazy(() => import('./pages/users/EditUser'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Library = lazy(() => import('./pages/library/Library'))
const BookReader = lazy(() => import('./pages/library/BookReader'))
const AcademicLevels = lazy(() => import('./pages/levels/AcademicLevels'))


// Loading fallback component
const PageLoading = () => (
  <div className="min-h-[100dvh] w-full bg-background overflow-hidden relative flex items-center justify-center">
    <DoodleBackground numElements={10} />
    <div className="relative z-10">
      <LoadingButterfly size="md" />
    </div>
  </div>
)

const LegacyRemunerationRedirect = () => {
  const { projectId, centerId, semesterId } = useParams();
  return (
    <Navigate
      replace
      to={`/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/attendance/remuneration`}
    />
  );
};

function App() {
  const [pwaRecovery, setPwaRecovery] = useState<{ kind: 'update' | 'recovery'; registration?: ServiceWorkerRegistration } | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    const handlePwaRecovery = (event: Event) => {
      setPwaRecovery((event as CustomEvent<{ kind: 'update' | 'recovery'; registration?: ServiceWorkerRegistration }>).detail);
    };
    window.addEventListener('prangan:pwa-update', handlePwaRecovery);
    return () => window.removeEventListener('prangan:pwa-update', handlePwaRecovery);
  }, []);

  const applyPwaRecovery = async () => {
    if (!pwaRecovery) return;
    if (pwaRecovery.kind === 'update') {
      window.dispatchEvent(new CustomEvent('prangan:pwa-apply-update', { detail: { registration: pwaRecovery.registration } }));
      toast.success('Applying the update...');
      setPwaRecovery(null);
      return;
    }

    if ('caches' in window) {
      await Promise.all((await caches.keys()).map((cacheName) => caches.delete(cacheName)));
    }
    window.location.replace(window.location.href);
  };

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Public routes - redirect to /projects if authenticated */}
              <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/activate" element={<ActivateAccount />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes with layout */}
              <Route
                path="/administration"
                element={
                  <ProtectedRoute requireAdmin>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdministrationDashboard />} />
              </Route>

              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Projects />} />
                <Route
                  path="new"
                  element={
                    <ProtectedRoute requireAdmin>
                      <CreateProject />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":id/edit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <EditProject />
                    </ProtectedRoute>
                  }
                />
                <Route path=":projectId/dashboard" element={<ProjectDashboard />} />
                <Route path=":projectId/centers" element={<Centers />} />
                <Route
                  path=":projectId/centers/:centerId/dashboard"
                  element={<CenterDashboard />}
                />
                <Route
                  path=":projectId/centers/new"
                  element={
                    <ProtectedRoute requireAdmin>
                      <CreateCenter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:id/edit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <EditCenter />
                    </ProtectedRoute>
                  }
                />
                <Route path=":projectId/centers/:centerId/semesters" element={<Semesters />} />
                <Route
                  path=":projectId/centers/:centerId/semesters/new"
                  element={
                    <ProtectedRoute requireAdmin>
                      <CreateSemester />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/setup"
                  element={
                    <ProtectedRoute requireAdmin>
                      <SemesterSetup />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:id/edit"
                  element={
                    <ProtectedRoute requireAdmin>
                      <EditSemester />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard"
                  element={
                    <ProtectedRoute permission="workspace.view">
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/students"
                  element={
                    <ProtectedRoute permission="students.read">
                      <Students />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/users"
                  element={
                    <ProtectedRoute permission="staffAttendance.read">
                      <SemesterUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/students/new"
                  element={
                    <ProtectedRoute permission="students.manage">
                      <CreateStudent />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/students/:id/edit"
                  element={
                    <ProtectedRoute permission="students.manage">
                      <EditStudent />
                    </ProtectedRoute>
                  }
                />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/view" element={
                  <ProtectedRoute permission="staffAttendance.read">
                    <ViewAttendance />
                  </ProtectedRoute>
                } />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/mark" element={
                  <ProtectedRoute permission="staffAttendance.write">
                    <MarkAttendance />
                  </ProtectedRoute>
                } />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/remuneration" element={
                  <ProtectedRoute permission="staffAttendance.read">
                    <Remuneration />
                  </ProtectedRoute>
                } />
                <Route path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/attendance/renumeration" element={
                  <LegacyRemunerationRedirect />
                } />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/bank-details"
                  element={
                    <ProtectedRoute allowAll={true}>
                      <Navigate to="/profile#payment" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/student-attendance/view"
                  element={
                    <ProtectedRoute permission="studentAttendance.read">
                      <ViewStudentAttendance />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/student-attendance/mark"
                  element={
                    <ProtectedRoute permission="studentAttendance.write">
                      <MarkStudentAttendance />
                    </ProtectedRoute>
                  }
                />
                {/* Syllabus Routes */}
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus"
                  element={
                    <ProtectedRoute permission="curriculum.read">
                      <SyllabusManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus/create"
                  element={
                    <ProtectedRoute permission="curriculum.manage">
                      <CreateSyllabus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus/:syllabusId/edit"
                  element={
                    <ProtectedRoute permission="curriculum.manage">
                      <EditSyllabus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/syllabus/:syllabusId/progress"
                  element={
                    <ProtectedRoute permission="curriculum.progress.write">
                      <SyllabusProgress />
                    </ProtectedRoute>
                  }
                />
                {/* Exam Routes */}
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams"
                  element={
                    <ProtectedRoute permission="exams.read">
                      <ExamManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams/create"
                  element={
                    <ProtectedRoute permission="exams.manage">
                      <CreateExam />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams/:examId/edit"
                  element={
                    <ProtectedRoute permission="exams.manage">
                      <EditExam />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":projectId/centers/:centerId/semesters/:semesterId/dashboard/exams/:examId/scores"
                  element={
                    <ProtectedRoute permission="scores.read">
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
                <Route path="settings" element={<Settings />} />
                <Route path="bank" element={<Navigate to="/profile#payment" replace />} />
              </Route>

              <Route
                path="/academic-levels"
                element={
                  <ProtectedRoute requireAdmin>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AcademicLevels />} />
              </Route>

              <Route
                path="/registration-requests"
                element={
                  <ProtectedRoute requireAdmin>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/users?view=requests" replace />} />
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

              <Route path="*" element={<NotFoundPage />} />
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

        <ConfirmationModal
          isOpen={!!pwaRecovery}
          onClose={() => setPwaRecovery(null)}
          onConfirm={() => void applyPwaRecovery()}
          title={pwaRecovery?.kind === 'update' ? 'Update available' : 'Reload with fresh app data'}
          message={pwaRecovery?.kind === 'update'
            ? 'A newer version is ready. Apply it now to reload with the latest changes.'
            : 'The app could not load a required resource. Clear cached app files and reload?'}
          confirmText={pwaRecovery?.kind === 'update' ? 'Update now' : 'Clear cache and reload'}
          variant={pwaRecovery?.kind === 'update' ? 'default' : 'warning'}
        />

        {/* {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />} */}
      </QueryClientProvider>
    </>
  )
}

export default App
