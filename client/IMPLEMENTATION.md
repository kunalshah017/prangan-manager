# Prangan Manager - API Client & Authentication Implementation

## Overview

The Prangan Manager React application now has a complete centralized API client, authentication system using Zustand for state management, and reusable API hooks. This implementation provides a solid foundation for user authentication and is ready for extension to other resources.

## 🏗️ Architecture Components

### 1. Centralized API Client (`src/lib/api.ts`)

**Features:**

- Axios-based HTTP client with base URL configuration
- Automatic JWT token injection via request interceptors
- Response interceptors for error handling (401, 403, 5xx)
- TypeScript interfaces for all API requests/responses
- Automatic logout on 401 (unauthorized) responses

**Configuration:**

- Development: `http://localhost:4000/api/v1`
- Production: `https://your-production-api.com/api/v1`

### 2. Zustand Authentication Store (`src/stores/authStore.ts`)

**State Management:**

- User information (name, email, role, status)
- JWT token storage
- Authentication status
- Loading states
- Error handling

**Actions:**

- `login(credentials)` - Authenticate user and store token
- `register(userData)` - Register new user account
- `logout()` - Clear auth state and token
- `clearError()` - Reset error state
- `isAdmin()` - Check if current user has admin role

**Persistence:**

- Automatic state persistence to localStorage
- Token expiration validation
- Auth state restoration on app startup

### 3. Authentication Utilities (`src/lib/auth.ts`)

**Helper Functions:**

- `isTokenExpired(token)` - Check JWT expiration
- `decodeJWT(token)` - Safely decode JWT payload
- `validateToken()` - Server-side token validation
- `formatUserFromToken(payload, email)` - Convert JWT to User object

### 4. API Hooks (`src/hooks/useApi.ts`)

**Generic Hooks:**

- `useApiCall<T>()` - Generic API request hook with loading/error states
- `useApiMutation<TRequest, TResponse>()` - Generic mutation hook

**Resource-Specific Hooks:**

- **Projects:** `useProjects()`, `useProjectMutations()`
- **Centers:** `useCenters()`, `useCenterMutations()`
- **Semesters:** `useSemesterMutations()`
- **Users:** `useUsers()`, `usePendingUsers()`, `useUserMutations()`

### 5. Route Protection (`src/components/ProtectedRoute.tsx`)

**Features:**

- Authentication requirement enforcement
- Admin-only route protection
- Automatic redirect to login for unauthorized users
- Custom error pages for insufficient permissions
- Loading states during auth checks

### 6. Updated Components

**Layout Component (`src/components/Layout.tsx`):**

- Integrated with auth store for user display
- Logout functionality in navigation
- Dynamic user avatar/initials
- Admin-specific navigation (if needed)

**App Component (`src/App.tsx`):**

- Protected route implementation
- Separate admin-only routes for sensitive features
- Lazy loading with proper error boundaries

## 🔌 API Endpoints Supported

Based on backend documentation at `server/readme.md`:

### Authentication

- `POST /api/v1/users/register` - User registration
- `POST /api/v1/users/login` - User authentication

### Projects (Protected)

- `GET /api/v1/projects` - List all projects
- `POST /api/v1/projects/create` - Create project (Admin only)
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### Users (Admin Protected)

- `GET /api/v1/users` - List all users
- `GET /api/v1/users?status=PENDING` - List pending registrations
- `PUT /api/v1/users/:id/approve` - Approve user registration
- `PUT /api/v1/users/:id/reject` - Reject user registration
- `PUT /api/v1/users/:id/role` - Update user role

## 🚀 Usage Examples

### Authentication in Components

```tsx
import { useAuthStore } from "@/stores/authStore";

const LoginForm = () => {
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (credentials) => {
    try {
      await login(credentials);
      navigate("/projects");
    } catch {
      // Error handled by store
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* form fields */}
      <button disabled={isLoading}>
        {isLoading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
};
```

### API Data Fetching

```tsx
import { useProjects, useProjectMutations } from "@/hooks/useApi";

const ProjectsList = () => {
  const {
    data: projectsData,
    loading,
    error,
    execute: refetch,
  } = useProjects({
    immediate: true,
  });
  const { createProject, loading: creating } = useProjectMutations();

  const handleCreate = async (projectData) => {
    try {
      await createProject(projectData);
      await refetch(); // Refresh list
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {projectsData?.projects.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
};
```

### Protected Routes

```tsx
// App.tsx
<Route
  path="/admin/*"
  element={
    <ProtectedRoute adminOnly>
      <AdminLayout />
    </ProtectedRoute>
  }
>
  <Route path="users" element={<UserManagement />} />
  <Route path="settings" element={<AdminSettings />} />
</Route>
```

## 🔒 Security Features

1. **JWT Token Management**

   - Automatic token expiration checking
   - Secure token storage in localStorage
   - Automatic cleanup on logout

2. **Request Security**

   - Automatic token injection in requests
   - HTTPS enforcement for production
   - Request timeout configuration

3. **Route Protection**

   - Authentication requirement enforcement
   - Role-based access control
   - Automatic redirects for unauthorized access

4. **Error Handling**
   - Graceful error messaging
   - Automatic token cleanup on auth errors
   - User-friendly error pages

## 🚀 Ready for Extension

The implementation is designed for easy extension:

1. **New Resources:** Add new hooks in `useApi.ts` following existing patterns
2. **Additional Auth Features:** Extend auth store with new actions
3. **Role-Based Features:** Use `isAdmin()` helper for conditional rendering
4. **New API Endpoints:** Add interfaces in `api.ts` and corresponding hooks

## 📱 Mobile & Responsive

- All components are fully responsive
- Touch-friendly navigation
- Mobile-optimized layouts
- Progressive enhancement approach

## 🛡️ Error Boundaries & Loading States

- Comprehensive loading states throughout the app
- Error boundaries for graceful error handling
- User feedback for all async operations
- Retry mechanisms where appropriate

This implementation provides a robust foundation for the Prangan Manager application with modern React patterns, TypeScript safety, and scalable architecture.
