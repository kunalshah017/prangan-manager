# Semester Expenses and Remuneration Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an administrator-only semester expense ledger and an idempotent monthly remuneration payment workflow backed by attendance, effective-dated rates, and the email outbox.

**Architecture:** A focused expense service owns scope validation, listing, manual entry, voiding, and per-user remuneration transactions. Fastify controllers expose strict `/api/v1/expenses` contracts. The React client uses one expense query module, a responsive ledger page, and a read-only remuneration payment page while retaining Semester Users as the only configuration surface.

**Tech Stack:** PostgreSQL, Prisma 6, Fastify 5, Node test runner, React 19, TanStack Query 5, React Router 7, Tailwind CSS 4, Vitest, Testing Library.

---

### Task 1: Expense persistence and input contracts

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260725210000_add_semester_expenses/migration.sql`
- Create: `server/security/expense-input.ts`
- Create: `server/tests/security/expense-schema.test.ts`
- Create: `server/tests/security/expense-input.test.ts`

- [ ] **Step 1: Write failing schema and parser tests**

Cover the required relations, indexes, nullable unique `sourceKey`, nonnegative amount constraint, complete void metadata constraint, strict unknown-field rejection, canonical `YYYY-MM`, unique nonempty user IDs, valid date-only values, positive manual amounts, trimmed category/title/notes, and required void reason.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `cd server && npm test -- --test-name-pattern="expense schema|expense input"`

Expected: FAIL because `Expense` and `expense-input.ts` do not exist.

- [ ] **Step 3: Add the minimal schema, SQL migration, and parsers**

Add `ExpenseStatus`, the `Expense` model and all required inverse relations. Export `parseExpenseListQuery`, `parseManualExpenseInput`, `parseVoidExpenseInput`, and `parseRemunerationPaymentInput` as discriminated `{ data } | { error }` results so controllers can return stable 400 responses before database work.

- [ ] **Step 4: Run focused tests and Prisma validation**

Run: `cd server && npm test -- --test-name-pattern="expense schema|expense input" && npx prisma validate && npx prisma generate`

Expected: PASS and Prisma client generated successfully.

### Task 2: Expense domain service and payment email

**Files:**
- Create: `server/email/remuneration-payment-email.ts`
- Create: `server/service/expense.service.ts`
- Create: `server/tests/email/remuneration-payment-email.test.ts`
- Create: `server/tests/security/expense-service.test.ts`

- [ ] **Step 1: Write failing behavior tests**

Test scope/date clipping helpers, applicable effective periods, incomplete present dates, zero/no-attendance results, source keys, immutable metadata snapshots, manual create/list/void rules, duplicate payment mapping to `ALREADY_PAID`, and escaped INR payment email content.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd server && npm test -- --test-name-pattern="expense service|remuneration payment email"`

Expected: FAIL because the service and renderer do not exist.

- [ ] **Step 3: Implement the minimum domain service**

Validate project → center → semester in every public operation. Build Prisma filters and aggregate totals for active remuneration/manual expenses and optionally voided expenses. For each requested user, open an independent transaction, verify exact/historical scoped eligibility, load `PRESENT` attendance, resolve an effective rate per date, create one remuneration expense and one deduplicated outbox job atomically, and map unique-key conflicts to `ALREADY_PAID`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `cd server && npm test -- --test-name-pattern="expense service|remuneration payment email"`

Expected: PASS.

### Task 3: Expense HTTP API

**Files:**
- Create: `server/controllers/expense.controller.ts`
- Create: `server/routes/expense.routes.ts`
- Modify: `server/server.ts`
- Create: `server/tests/security/expense-controller.test.ts`
- Create: `server/tests/security/expense-route-wiring.test.ts`

- [ ] **Step 1: Write failing controller and route tests**

Cover unauthenticated/admin-only behavior, 400 parser failures, 404 hierarchy failures, 409 invalid state conflicts, stable 500 messages, route paths, auth prehandlers, and registration in `server.ts`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd server && npm test -- --test-name-pattern="expense controller|expense route"`

Expected: FAIL because the controller/routes are absent.

- [ ] **Step 3: Implement controllers and register routes**

Expose `GET /expenses`, `POST /expenses/manual`, `POST /expenses/:expenseId/void`, and `POST /expenses/remuneration-payments`. Require `request.user.role === ADMIN` in each controller and pass only parsed values plus the administrator ID to the service.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `cd server && npm test -- --test-name-pattern="expense controller|expense route"`

Expected: PASS.

### Task 4: Client expense data contracts

**Files:**
- Modify: `client/src/types/api.ts`
- Create: `client/src/hooks/useExpenseQueries.ts`
- Create: `client/src/tests/hooks/use-expense-queries.test.ts`

- [ ] **Step 1: Write a failing query-contract test**

Assert typed list totals/records, strict scope and filters, manual create/void/payment payloads, query-key inclusion of scope/filters, and invalidation of both expense and remuneration/attendance data after successful mutations.

- [ ] **Step 2: Run the test and verify RED**

Run: `cd client && npm run test:run -- src/tests/hooks/use-expense-queries.test.ts`

Expected: FAIL because the query module and types do not exist.

- [ ] **Step 3: Add types and TanStack Query hooks**

Implement `useExpenses`, `useCreateManualExpense`, `useVoidExpense`, and `useMarkRemunerationPaid` using the existing `api` client and minimal cache invalidation.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `cd client && npm run test:run -- src/tests/hooks/use-expense-queries.test.ts`

Expected: PASS.

### Task 5: Responsive administrator Expenses page

**Files:**
- Create: `client/src/pages/expenses/Expenses.tsx`
- Create: `client/src/tests/pages/expenses-page.test.tsx`

- [ ] **Step 1: Write failing page tests**

Cover summary totals, filter controls, desktop table/mobile cards, add form validation, mutation feedback, required void reason, audit/source labels, retry, loading, empty and error states, semantic labels, focus-visible controls, and 44px mobile targets.

- [ ] **Step 2: Run the page test and verify RED**

Run: `cd client && npm run test:run -- src/tests/pages/expenses-page.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Build the responsive ledger**

Use the existing Prangan tokens and workspace shell. Present warm orange accents with restrained emerald paid states, dense but readable summary cards, a `md` desktop table and compact mobile cards, controlled filters/forms, native date and numeric inputs, category suggestions, an accessible modal/sheet, visible source/audit metadata, and no decorative gradients.

- [ ] **Step 4: Run the focused page test and verify GREEN**

Run: `cd client && npm run test:run -- src/tests/pages/expenses-page.test.tsx`

Expected: PASS.

### Task 6: Read-only remuneration payment workflow

**Files:**
- Modify: `client/src/pages/attendance/Remuneration.tsx`
- Modify: `client/src/lib/remuneration.ts`
- Modify: `client/src/tests/lib/remuneration.test.ts`
- Modify: `client/src/tests/pages/monthly-remuneration.test.tsx`
- Modify: `client/src/tests/pages/monthly-remuneration-interactions.test.tsx`

- [ ] **Step 1: Replace editable-state expectations with failing payment tests**

Assert no remuneration input/effective-date/save controls, exact Semester Users settings link, read-only schedule summaries, `Ready`/`Incomplete`/`No payment due`/`Paid`, paid amount/date, individual and bulk actions only for a month, select-all-ready, disabled incomplete actions, progress, and partial result feedback.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `cd client && npm run test:run -- src/tests/lib/remuneration.test.ts src/tests/pages/monthly-remuneration.test.tsx src/tests/pages/monthly-remuneration-interactions.test.tsx`

Expected: FAIL against the editable remuneration page.

- [ ] **Step 3: Implement the read-only payment page**

Keep the attendance-derived display and bank copy helpers, remove drafts and rate mutations, merge returned/queried payment state into monthly rows, add selection and per-user/bulk mutations, retain full-semester summary without payment actions, and announce partial outcomes without optimistic paid state.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the command from Step 2.

Expected: PASS.

### Task 7: Routing, dashboard navigation, and final verification

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/lib/dashboard.ts`
- Modify: `client/src/lib/breadcrumbs.ts`
- Modify: relevant routing/dashboard tests under `client/src/tests/`

- [ ] **Step 1: Write failing route/navigation tests**

Assert the exact semester Expenses route is wrapped in `<ProtectedRoute requireAdmin>`, lazy loaded, breadcrumb-labelled, and only offered to global administrators alongside Remuneration.

- [ ] **Step 2: Run routing tests and verify RED**

Run: `cd client && npm run test:run -- src/tests/pages/workspace-dashboard-routing.test.ts src/tests/lib/dashboard.test.ts src/tests/lib/breadcrumbs.test.ts`

Expected: FAIL because Expenses is not wired.

- [ ] **Step 3: Add route, navigation action, and breadcrumb**

Use the existing dashboard action model and forbidden route experience; do not add a second authorization mechanism.

- [ ] **Step 4: Run all verification gates**

Run:

```bash
cd server && npx prisma validate && npx prisma generate && npm test && npm run build
cd client && npm run test:run && npm run lint && npm run build
```

Expected: all commands exit 0 with no test failures or lint errors.

- [ ] **Step 5: Browser-check responsive behavior**

Inspect Remuneration and Expenses at 375×812 and 1440×900. Verify no horizontal page overflow, table/card breakpoint switching, readable modal/sheet content, keyboard focus, loading/empty/error/retry states, and payment buttons disabled for incomplete rows. Exercise repeated payment requests against a test database and confirm one Expense and one EmailJob per source key.
