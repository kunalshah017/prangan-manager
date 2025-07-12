import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import DoodleBackground from '@/components/DoodleBackground'
import LoadingButterfly from '@/components/LoadingButterfly'
import ProtectedRoute from '@/components/ProtectedRoute'
import PublicRoute from '@/components/PublicRoute'
import { queryClient } from '@/lib/query-client'
import { initializeAuth } from '@/stores/authStore'

// Layouts
const Layout = lazy(() => import('./components/Layout'))

// Pages
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Projects = lazy(() => import('./pages/projects/Projects'))
const CreateProject = lazy(() => import('./pages/projects/CreateProject'))
const EditProject = lazy(() => import('./pages/projects/EditProject'))
const RegistrationRequests = lazy(() => import('./pages/RegistrationRequests'))

// Loading fallback component
const PageLoading = () => (
  <div className="min-h-screen w-full bg-background overflow-hidden relative flex items-center justify-center">
    <DoodleBackground numElements={10} />
    <div className="relative z-10">
      <LoadingButterfly message="Loading..." size="md" />
    </div>
  </div>
)

function App() {
  useEffect(() => {
    initializeAuth();
  }, []);

  return (
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
            </Route>

            <Route
              path="/registration-requests"
              element={
                <ProtectedRoute adminOnly>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RegistrationRequests />} />
            </Route>

            {/* Redirect any unmatched routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
