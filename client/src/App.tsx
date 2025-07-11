import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DoodleBackground from '@/components/DoodleBackground'
import ProtectedRoute from '@/components/ProtectedRoute'

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
    <div className="relative z-10 flex flex-col items-center">
      <div className="animate-pulse h-10 w-10 rounded-full bg-orange-500 mb-4" />
      <p className="text-orange-700 font-medium">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

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
  )
}

export default App
