# Admin-only semester settings and pay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limit Team settings and Pay to administrators while allowing center managers to open curriculum progress.

**Architecture:** Dashboard actions and React routes enforce the intended UI boundary. The server independently restricts semester-user and remuneration endpoints to administrators. Curriculum progress uses the existing curriculum-progress permission, which center managers lack in the frontend permission table despite being allowed to view the curriculum.

**Tech Stack:** React, TypeScript, React Router, Vitest, Fastify, Node test runner.

---

### Task 1: Dashboard action visibility

**Files:**
- Modify: `client/src/tests/lib/dashboard.test.ts`
- Modify: `client/src/lib/dashboard.ts`

- [ ] **Step 1: Write failing dashboard expectations**

```ts
expect(labels(model)).not.toContain("Semester users");
expect(labels(model)).not.toContain("Remuneration");
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm run test:run -- src/tests/lib/dashboard.test.ts`

Expected: the center-manager expectation fails because both actions are currently present.

- [ ] **Step 3: Restrict both actions to admins**

Wrap each existing dashboard action in `user?.role === "ADMIN" ? ... : null`.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npm run test:run -- src/tests/lib/dashboard.test.ts`

Expected: 5 passing tests.

### Task 2: Frontend route protection and curriculum progress

**Files:**
- Modify: `client/src/tests/lib/access.test.ts`
- Modify: `client/src/tests/pages/semester-users.test.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/lib/access.ts`

- [ ] **Step 1: Write failing access and route expectations**

```ts
expect(can(centerManager, "curriculum.progress.write", context)).toBe(true);
expect(app).toContain('<ProtectedRoute requireAdmin>');
```

- [ ] **Step 2: Run focused frontend tests and confirm they fail**

Run: `npm run test:run -- src/tests/lib/access.test.ts src/tests/pages/semester-users.test.ts`

Expected: center managers lack curriculum-progress permission and the Team settings route is not admin-only.

- [ ] **Step 3: Add the existing curriculum progress permission to center managers and guard Team settings and Pay routes with `requireAdmin`**

Add `"curriculum.progress.write"` to `CENTER_MANAGER` and use `ProtectedRoute requireAdmin` for both routes.

- [ ] **Step 4: Run focused frontend tests and confirm they pass**

Run: `npm run test:run -- src/tests/lib/access.test.ts src/tests/pages/semester-users.test.ts src/tests/pages/remuneration-page.test.ts`

Expected: all selected tests pass.

### Task 3: Server authorization

**Files:**
- Create: `server/tests/security/admin-semester-settings-and-remuneration.test.ts`
- Modify: `server/controllers/user.controller.ts`

- [ ] **Step 1: Write a failing source-level authorization test**

```ts
expect(source).toMatch(/getRemunerationUsersController[\\s\\S]*authUser\\.role !== Role\\.ADMIN/);
expect(source).toMatch(/getSemesterUsersController[\\s\\S]*authUser\\.role !== Role\\.ADMIN/);
```

- [ ] **Step 2: Run the server test and confirm it fails**

Run: `npm test -- tests/security/admin-semester-settings-and-remuneration.test.ts`

Expected: the controllers still accept a `CENTER_MANAGER` scope.

- [ ] **Step 3: Require `Role.ADMIN` in semester-user and remuneration list/rate/period controllers**

Use the same `Role.ADMIN` guard already used by `updateSemesterUserAssignmentsController`.

- [ ] **Step 4: Run the server test and confirm it passes**

Run: `npm test -- tests/security/admin-semester-settings-and-remuneration.test.ts`

Expected: test passes.

### Task 4: Final verification and commit

**Files:**
- Modify: the files above

- [ ] **Step 1: Run client checks**

Run: `npm run lint && npm run test:run && npm run build`

Expected: exit code 0.

- [ ] **Step 2: Run server checks**

Run: `npm test && npm run build`

Expected: exit code 0.

- [ ] **Step 3: Review the diff and commit the implementation**

Run: `git diff --check`, then stage only the listed files and commit with `fix: restrict semester settings to admins`.
