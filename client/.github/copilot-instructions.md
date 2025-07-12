# Prangan Manager - AI Coding Agent Instructions

## Project Overview

React 19 + TypeScript + Vite app for educational project management, featuring a modern stack with TanStack Query, Zustand state management, Tailwind CSS 4, and custom loading animations.

## Architecture & Data Flow

### State Management Pattern

- **Zustand** (`src/stores/authStore.ts`) for global auth state with localStorage persistence
- **TanStack Query** (`src/lib/query-client.ts`) for server state management
- **Unified Auth Hook** (`src/hooks/useAuth.ts`) bridges Zustand store and TanStack Query mutations

```tsx
// Pattern: Always use useAuth() hook, never direct store access
const { isAuthenticated, login, logout, user } = useAuth();
```

### API Layer Architecture

- **Fetch-based client** (`src/lib/api-client.ts`) with JWT token injection and error handling
- **Query hooks** (`src/hooks/*Queries.ts`) for each domain (auth, projects, users, etc.)
- **Type-safe responses** using interfaces from `src/types/api.ts`

### Route Protection Pattern

```tsx
// Public routes redirect authenticated users to /projects
<Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

// Protected routes require authentication
<Route path="/projects" element={<ProtectedRoute><Layout /></ProtectedRoute>} />

// Admin-only routes
<Route path="/admin" element={<ProtectedRoute adminOnly><Layout /></ProtectedRoute>} />
```

## Component Patterns

### Loading States

- **LoadingButterfly** (`src/components/LoadingButterfly.tsx`) with ripple animation - supports `xs|sm|md|lg` sizes
- **CustomButton** (`src/components/ui/custom-button.tsx`) with integrated loading state:

```tsx
<CustomButton isLoading={isPending} loadingMessage="Creating...">
  Create Project
</CustomButton>
```

### UI Components

- **shadcn/ui inspired** structure in `src/components/ui/`
- **Class Variance Authority** for button variants (`src/lib/button-variants.ts`)
- **Tailwind merge** via `cn()` utility (`src/lib/utils.ts`)

### Animation Patterns

- **Framer Motion** for page transitions and micro-interactions
- **DoodleBackground** (`src/components/DoodleBackground.tsx`) provides animated educational icons
- **Mobile-first responsive** design with hover effects disabled on touch devices

## Development Workflow

### Key Commands

```bash
npm run dev          # Development server on port 5173
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint with React and TypeScript rules
npm run preview      # Preview production build
```

### Project Structure Conventions

```
src/
├── components/          # Shared components
│   ├── ui/             # Basic UI primitives (buttons, inputs)
│   └── [ComponentName].tsx
├── pages/              # Route components
│   └── projects/       # Feature-grouped pages
├── hooks/              # Custom hooks (query hooks, useAuth)
├── lib/                # Utilities (API client, query config)
├── stores/             # Zustand stores
└── types/              # TypeScript interfaces
```

### Import Conventions

- Use `@/` path alias for all internal imports
- Group imports: React, third-party, internal components, utils/types
- Export components from `index.ts` files where applicable

## Critical Integration Points

### Authentication Flow

1. User credentials → `useAuth().login()` → TanStack Query mutation
2. Success → Zustand store updates → localStorage persistence → redirect
3. Page load → `initializeAuth()` checks localStorage → hydrates store

### Error Handling

- API errors use custom `ApiError` class with status codes
- TanStack Query retry logic skips 4xx errors (client errors)
- Form validation errors displayed via error state in components

### Build Configuration

- **Vite + React** with TypeScript strict mode
- **Tailwind CSS 4** via Vite plugin
- **Path resolution** `@/*` maps to `src/*`
- **Development proxy** configured for ngrok tunneling

## Specific Patterns to Follow

### Loading Button Pattern

```tsx
// ❌ Don't use manual loading states
{
  isLoading ? <Spinner /> : "Submit";
}

// ✅ Use CustomButton component
<CustomButton isLoading={isLoading} loadingMessage="Submitting...">
  Submit
</CustomButton>;
```

### Query Hook Pattern

```tsx
// Follow this structure for all query hooks
export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.getAll(),
    staleTime: 5 * 60 * 1000,
  });
};
```

### Component Prop Patterns

- Use `React.forwardRef` for UI components that might need refs
- Extend HTML element props: `extends React.ButtonHTMLAttributes<HTMLButtonElement>`
- Support `className` prop and merge with `cn()` utility
- Use `VariantProps` from CVA for variant-based components

## Theme & Styling

- **Orange/amber** primary color scheme (`bg-orange-600`, `text-orange-700`)
- **Glass morphism** effects with `bg-white/80` and `backdrop-blur`
- **Consistent spacing** using Tailwind's scale
- **Custom CSS variables** defined in `src/index.css` for theme colors
