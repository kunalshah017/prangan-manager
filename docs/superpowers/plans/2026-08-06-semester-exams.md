# Semester Exams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incomplete semester exam pages with a mobile-first, fully functional workspace experience.

**Architecture:** Reuse the existing workspace frame, query hooks, API types, and button components. Keep route and permission boundaries unchanged; pages compose compact cards and forms from the current data and only add focused local helpers where the score roster requires them.

**Tech Stack:** React, TypeScript, React Query, React Router, Tailwind CSS, Vitest, Lucide.

---

### Task 1: Define the mobile exam workspace contract

**Files:**

- Modify: `client/src/tests/pages/exam-workspace.test.ts`
- Modify: `client/src/tests/pages/exam-scores.test.ts`

- [ ] Add failing assertions for the create/score-entry actions, enrollment-indexed scores, save action, pending-only bulk absence action, and removal of `updatedScorePlaceholder`.
- [ ] Run `npm run test:run -- src/tests/pages/exam-workspace.test.ts src/tests/pages/exam-scores.test.ts`; expect failure before implementation.

### Task 2: Rebuild the exam list and shared form presentation

**Files:**

- Modify: `client/src/pages/exams/ExamManagement.tsx`
- Modify: `client/src/pages/exams/ExamForm.tsx`
- Modify: `client/src/pages/exams/CreateExam.tsx`
- Modify: `client/src/pages/exams/EditExam.tsx`
- Test: `client/src/tests/pages/exam-workspace.test.ts`

- [ ] Replace bare inputs and rows with compact responsive cards using `WorkspacePage`, existing design tokens, and 44px controls.
- [ ] Add retry and empty states, plus score and edit links guarded by existing permissions.
- [ ] Group the shared form into assessment details and LSRW maximum marks without changing the request payload.
- [ ] Run `npm run test:run -- src/tests/pages/exam-workspace.test.ts`; expect pass.

### Task 3: Make the score roster functional

**Files:**

- Modify: `client/src/pages/exams/ExamScores.tsx`
- Test: `client/src/tests/pages/exam-workspace.test.ts`
- Test: `client/src/tests/pages/exam-scores.test.ts`

- [ ] Build a `scoreByEnrollmentId` map from saved scores and render a compact editable score card per active enrollment in the exam level.
- [ ] Save an existing record with `useUpdateStudentScore`; create a missing record with `useCreateStudentScore` using the selected enrollment and exam IDs.
- [ ] Constrain each numeric input to its exam maximum, calculate its total locally, and disable scoring inputs when marked absent.
- [ ] Limit bulk absence to missing scores so entered scores are never overwritten; close the modal only after success.
- [ ] Run `npm run test:run -- src/tests/pages/exam-workspace.test.ts src/tests/pages/exam-scores.test.ts`; expect pass.

### Task 4: Verify and commit

**Files:**

- Modify: files from Tasks 1–3

- [ ] Run `npm run test:run`, `npm run lint`, and `npm run build` from `client`; expect all pass.
- [ ] Run `git diff --check`, review the scoped diff, and commit all exam page, test, design, and plan changes with `feat: redesign semester exam workspace`.
