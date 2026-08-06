# Semester Exams Design

## Purpose

Make every exam route in a semester usable on a phone first, while keeping the established workspace look and existing permissions, routes, and API contracts intact.

## Chosen approach

Use the existing `WorkspacePage`, `WorkspacePageHeader`, button variants, query hooks, and Tailwind design tokens. This keeps the experience consistent, avoids a dependency, and makes the same semantic content stack naturally on narrow screens.

## Experience

- The exam list has a compact header, a primary create action when permitted, searchable/filterable controls, concise status counts, and touch-friendly exam cards. Each card exposes score entry and edit actions only when the current user is permitted.
- Create and edit share one form, grouped into assessment details and maximum marks. Controls keep a minimum 44px hit target and form actions remain easy to reach on mobile.
- Score entry presents completion statistics, a search and completion filter, and a card-based roster. Each card can create or update L/S/R/W scores, toggle absence, and show the calculated total against the exam maximum. The bulk absence action only affects students without existing scores and is confirmed in a modal.
- Loading, empty, access-denied, and query-error states are explicit and recoverable. The score page does not rely on placeholder mutations or hidden side effects.

## Data and permissions

Existing exam, score, enrollment, statistics, and mutation hooks remain the interfaces. The page builds its roster from active enrollments in the exam's managed semester level, indexes saved scores by enrollment ID, and uses the returned score IDs for updates. Existing `exams.read`, `exams.manage`, `scores.read`, and `scores.write` checks remain authoritative.

## Verification

Client tests cover mobile-oriented page structure, permission-aware actions, score creation/update paths, absence safeguards, and meaningful query states. Targeted tests, the full client suite, lint, and production build must pass before commit.
