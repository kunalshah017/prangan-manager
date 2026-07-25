# Application Wayfinding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consistent, accessible back buttons and breadcrumbs across every application route.

**Architecture:** Extend the existing pure breadcrumb route model, then render one responsive wayfinding rail from the shared authenticated layout. Keep the full-screen reader aligned with a compact local breadcrumb because it intentionally does not use that layout.

**Tech Stack:** React 19, React Router, TypeScript, Tailwind CSS, Lucide React, Vitest

---

### Task 1: Complete the route hierarchy contract

**Files:**
- Modify: `client/src/lib/breadcrumbs.ts`
- Modify: `client/src/tests/lib/breadcrumbs.test.ts`

- [ ] **Step 1: Add failing route-coverage tests**

Add table-driven assertions for `/projects`, `/administration`,
`/academic-levels`, semester setup, every dashboard section, users, profile,
and library. Each route must return a non-empty trail whose last item is the
current page.

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm run test:run -- src/tests/lib/breadcrumbs.test.ts
```

Expected: failures for root Projects, Academic Levels, and Semester Setup.

- [ ] **Step 3: Implement the missing breadcrumb branches**

Return `current("Projects")` for the projects root, add Administration and
Academic Levels trails, and add a Semester Setup trail that links through the
project and center.

- [ ] **Step 4: Add and test parent derivation**

Add a pure helper:

```ts
export const getBreadcrumbBackTarget = (breadcrumbs: AppBreadcrumb[]) =>
  [...breadcrumbs].reverse().find((item) => item.href);
```

Assert a student edit trail resolves to Students and a single-item root trail
returns `undefined`.

- [ ] **Step 5: Run the focused test**

Run:

```bash
npm run test:run -- src/tests/lib/breadcrumbs.test.ts
```

Expected: all breadcrumb tests pass.

### Task 2: Build the shared responsive wayfinding rail

**Files:**
- Modify: `client/src/components/BreadcrumbNavigation.tsx`
- Modify: `client/src/tests/components/layout-workspace-navigation.test.ts`
- Modify: `client/src/tests/components/navigation-recovery.test.ts`

- [ ] **Step 1: Add failing shared-navigation assertions**

Require the component to use `ArrowLeft`, `useNavigate`, the breadcrumb parent
helper, an accessible destination-aware label, and a `min-h-11` touch target.
Require the component to render single-item trails instead of returning early.

- [ ] **Step 2: Run focused component tests**

Run:

```bash
npm run test:run -- src/tests/components/layout-workspace-navigation.test.ts src/tests/components/navigation-recovery.test.ts
```

Expected: failures because the shared back control does not exist.

- [ ] **Step 3: Implement the rail**

Place a back link/button before the existing scrollable breadcrumb navigation.
Use the nearest linked parent for nested pages and `navigate(-1)` for root
pages. Keep the visible mobile label short while retaining the full
destination-aware `aria-label`.

- [ ] **Step 4: Run focused component tests**

Run the command from Step 2.

Expected: all focused tests pass.

### Task 3: Complete full-screen and public route coverage

**Files:**
- Create: `client/src/components/StandalonePageNavigation.tsx`
- Modify: `client/src/pages/library/BookReader.tsx`
- Modify: `client/src/pages/Login.tsx`
- Modify: `client/src/pages/Register.tsx`
- Modify: `client/src/pages/ResetPassword.tsx`
- Modify: `client/src/pages/AccountTokenForm.tsx`
- Modify: `client/src/components/NotFoundPage.tsx`
- Modify: `client/src/components/ProtectedRoute.tsx`
- Modify: `client/src/tests/pages/library.test.ts`
- Modify: `client/src/tests/pages/public-navigation.test.ts`

- [ ] **Step 1: Add failing reader breadcrumb assertions**

Require a semantic breadcrumb nav containing a Library link, separator, and
the current book title while preserving the existing Back to Library control.

- [ ] **Step 2: Add a public-route audit test**

Read the welcome/auth/access-denied/not-found sources and assert that each
non-root standalone screen uses `StandalonePageNavigation` with an explicit
return destination. Assert the welcome screen remains the intentional root.
For access-denied states, assert only outer route guards render standalone
navigation; nested guards reuse the layout rail.

- [ ] **Step 3: Run focused tests**

Run:

```bash
npm run test:run -- src/tests/pages/library.test.ts src/tests/pages/public-navigation.test.ts
```

Expected: the reader breadcrumb assertions fail before implementation.

- [ ] **Step 4: Implement the reader trail**

Use React Router `Link` and the existing `location.search` context. Keep the
title truncated visually while exposing the full text with `title`.

- [ ] **Step 5: Run focused tests**

Run the command from Step 3.

Expected: all focused tests pass.

### Task 4: Remove duplicate legacy header controls

**Files:**
- Modify: `client/src/pages/centers/Centers.tsx`
- Modify: `client/src/pages/semesters/Semesters.tsx`
- Modify: `client/src/pages/users/UserDetails.tsx`
- Modify: `client/src/pages/users/EditUser.tsx`
- Modify: `client/src/pages/exams/ExamScores.tsx`
- Modify: `client/src/pages/syllabus/CreateSyllabus.tsx`
- Modify: `client/src/pages/syllabus/EditSyllabus.tsx`
- Modify: `client/src/pages/syllabus/SyllabusProgress.tsx`
- Create: `client/src/tests/pages/shared-back-navigation.test.ts`

- [ ] **Step 1: Add a failing duplicate-control audit**

Assert that the known workspace headers no longer render their own back control
while error recovery links remain available.

- [ ] **Step 2: Run the focused test**

```bash
npm run test:run -- src/tests/pages/shared-back-navigation.test.ts
```

Expected: fail on each legacy header control.

- [ ] **Step 3: Remove only duplicate header controls**

Delete the back action from each normal page header. Keep navigation used by
error panels, save completion, and explicit form cancellation.

- [ ] **Step 4: Run the focused test**

Run the command from Step 2.

Expected: all duplicate-control assertions pass.

### Task 5: Verify and publish

**Files:**
- Review: all modified files

- [ ] **Step 1: Run complete verification**

```bash
cd client
npm run test:run
npm run lint
npm run build
```

Expected: every command exits zero.

- [ ] **Step 2: Review the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intended files.

- [ ] **Step 3: Request independent code review**

Review route completeness, back-stack behavior, keyboard/accessibility
semantics, and mobile overflow. Resolve every Critical or Important finding.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: add consistent application wayfinding"
git push origin main
```

Expected: local and remote `main` point to the new commit.
