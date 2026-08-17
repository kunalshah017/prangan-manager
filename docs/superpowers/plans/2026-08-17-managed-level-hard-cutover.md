# Managed Level Hard Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every runtime dependency on legacy operational `level` columns and make `semesterLevelId` the sole level reference across the database, server, and maintained client.

**Architecture:** Preserve `AcademicLevel.code` as catalog metadata, but resolve operational scope only through the `SemesterLevel` relation. Convert each server domain to canonical IDs first, update the client contract, then apply a guarded Prisma contract migration that replaces level-based constraints and drops the four mirrors.

**Tech Stack:** TypeScript 5.8, Node test runner with `tsx`, Fastify 5, Prisma 6/PostgreSQL, React 19, TanStack Query, Vitest, Vite.

## Global Constraints

- Hard cutover: legacy `level` request and response fields are unsupported.
- Do not rewrite historical migrations or historical design/plan documents.
- Do not modify the user's unrelated untracked `exam-papers/`, `scripts/`, or `prangan.code-workspace` files.
- Preserve `AcademicLevel.code`; remove only operational compatibility mirrors.
- Every behavior change follows red-green-refactor and records the expected failing output.
- Validation errors remain client errors and must not be converted to HTTP 500.

---

### Task 1: Canonical Semester-Level Resolver and User Management

**Files:**
- Modify: `server/service/semester-level.service.ts`
- Modify: `server/service/user.service.ts`
- Modify: `server/controllers/user.controller.ts`
- Modify: `server/security/user-selects.ts`
- Modify: `server/tests/security/semester-level-assignment.test.ts`
- Modify: `server/tests/security/student-hierarchy-integrity.test.ts`
- Modify: `server/tests/security/user-controller-wiring.test.ts`
- Modify: `client/src/hooks/useUserQueries.ts`
- Modify: `client/src/types/api.ts`
- Modify: `client/src/pages/users/EditUser.tsx`
- Modify: `client/src/components/ui/role-assignment-form.tsx`
- Modify: `client/src/tests/pages/users-filters.test.ts`

**Interfaces:**
- Consumes: `{ semesterId, semesterLevelId }` canonical context.
- Produces: `requireActiveSemesterLevel({ semesterId, semesterLevelId })` validation and management payloads containing `semesterLevelId` only.

- [ ] **Step 1: Write failing management and resolver regressions**

Add behavior tests proving an educator assignment with a canonical ID is reconciled without reading or writing `level`, and that a legacy-only input is rejected:

```ts
await bulkUpdateUserAssignments("user-1", [{
  subRole: SubRole.EDUCATOR,
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-level-2",
}]);
assert.equal(createdData.semesterLevelId, "semester-level-2");
assert.equal("level" in createdData, false);
```

Update the client contract test to require `semesterLevelId?: string` and reject a `level?: string` management payload type.

- [ ] **Step 2: Verify RED**

Run: `npm test -- --test-name-pattern="semester level|management" tests/security/semester-level-assignment.test.ts tests/security/student-hierarchy-integrity.test.ts tests/security/user-controller-wiring.test.ts`

Run from `client`: `npm run test:run -- src/tests/pages/users-filters.test.ts`

Expected: server fails because normalized writes still include `level`; client fails because the update type still exposes `level` and omits `semesterLevelId`.

- [ ] **Step 3: Implement the canonical management path**

Replace dual-input resolution with required canonical validation:

```ts
export const resolveSemesterLevelInput = (input: {
  semesterId?: string | null;
  semesterLevelId?: string | null;
}) => {
  if (!input.semesterId || !input.semesterLevelId) {
    throw new AcademicLevelServiceError(
      "Semester and semester level are required",
      422,
    );
  }
  return requireActiveSemesterLevel({
    semesterId: input.semesterId,
    semesterLevelId: input.semesterLevelId,
  });
};
```

Remove `resolveLegacyLevelCode`, all role-assignment `level` inputs, checks, selects, and writes. For non-educators normalize only `semesterLevelId: null`; for educators validate the canonical ID when present. Update management errors so `AcademicLevelServiceError.statusCode` is returned instead of a generic 500. Send only `semesterLevelId` from the client.

- [ ] **Step 4: Verify GREEN**

Repeat both focused commands. Expected: all selected tests pass with no legacy field in management requests or writes.

### Task 2: Canonical Student Enrollment and Semester Transition

**Files:**
- Modify: `server/service/user.service.ts`
- Modify: `server/controllers/user.controller.ts`
- Modify: `server/routes/user.route.ts`
- Modify: `server/service/semester-transition.service.ts`
- Modify: `server/security/semester-transition-input.ts`
- Modify: `server/lib/student-promotion.ts`
- Modify: `server/tests/security/student-hierarchy-controller.test.ts`
- Modify: `server/tests/security/student-hierarchy-integrity.test.ts`
- Modify: `server/tests/security/student-promotion.test.ts`
- Modify: `server/tests/security/semester-transition-summary.test.ts`
- Modify: `server/tests/security/semester-level-update-wiring.test.ts`
- Modify: `client/src/hooks/useStudentQueries.ts`
- Modify: `client/src/types/api.ts`
- Modify: `client/src/pages/semesters/Dashboard.tsx`
- Modify: `client/src/tests/pages/students-workspace.test.ts`
- Modify: `client/src/tests/pages/dashboard.test.ts`

**Interfaces:**
- Consumes: enrollment `semesterLevelId` and related `semesterLevel.academicLevel` metadata.
- Produces: enrollment create/update/filter operations keyed only by `semesterLevelId`; removes `/users/students/level/:level`.

- [ ] **Step 1: Write failing enrollment regressions**

Update enrollment fixtures and assertions to require this write shape:

```ts
assert.deepEqual(updateData, {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-2",
  isActive: undefined,
});
```

Add a route test proving only `/users/students/semester-level/:semesterLevelId` remains. Add a dashboard test proving no code-to-ID fallback reads `reference.level`.

- [ ] **Step 2: Verify RED**

Run from `server`: `npm test -- tests/security/student-hierarchy-controller.test.ts tests/security/student-hierarchy-integrity.test.ts tests/security/student-promotion.test.ts tests/security/semester-transition-summary.test.ts tests/security/semester-level-update-wiring.test.ts`

Run from `client`: `npm run test:run -- src/tests/pages/students-workspace.test.ts src/tests/pages/dashboard.test.ts`

Expected: failures identify legacy enrollment writes, level-code routes, and dashboard fallback behavior.

- [ ] **Step 3: Implement canonical enrollment behavior**

Remove `level` from enrollment input/output types, Prisma selects, filters, and writes. Replace source-level discovery in transitions with the existing relation:

```ts
const sourceAcademicLevel = enrollment.semesterLevel.academicLevel;
const targetLevel = targetSemesterLevels.find(
  (candidate) => candidate.academicLevelId === decision.targetAcademicLevelId,
);
```

Transition writes set only `semesterLevelId`. Remove the level-code student route/controller/service and dashboard fallback map.

- [ ] **Step 4: Verify GREEN**

Repeat focused server and client commands. Expected: all pass and enrollment mutations contain no `level` key.

### Task 3: Canonical Syllabus Domain

**Files:**
- Modify: `server/types/syllabus.types.ts`
- Modify: `server/security/syllabus-input.ts`
- Modify: `server/controllers/syllabus.controller.ts`
- Modify: `server/service/syllabus.service.ts`
- Modify: `server/routes/syllabus.routes.ts`
- Modify: `server/tests/security/syllabus-controller.test.ts`
- Modify: `server/tests/security/syllabus-integrity.test.ts`
- Modify: `server/tests/security/syllabus-authorization.test.ts`
- Modify: `client/src/hooks/useSyllabusQueries.ts`
- Modify: `client/src/types/api.ts`
- Modify: `client/src/tests/pages/curriculum-workspace.test.ts`

**Interfaces:**
- Consumes/produces: syllabus queries and mutations use `semesterLevelId` only; display metadata comes from `semesterLevel.academicLevel`.

- [ ] **Step 1: Write failing syllabus tests**

Require canonical create/update/filter data:

```ts
assert.deepEqual(createArgs.data, {
  projectId: "project-1",
  centerId: "center-1",
  semesterId: "semester-1",
  semesterLevelId: "semester-1-level-1",
  name: "SA 1",
  description: undefined,
});
assert.equal("level" in createArgs.data, false);
```

Input tests must reject `level` as unsupported and require `semesterLevelId`.

- [ ] **Step 2: Verify RED**

Run from `server`: `npm test -- tests/security/syllabus-controller.test.ts tests/security/syllabus-integrity.test.ts tests/security/syllabus-authorization.test.ts`

Run from `client`: `npm run test:run -- src/tests/pages/curriculum-workspace.test.ts`

Expected: failures expose dual writes, legacy filters, and legacy input acceptance.

- [ ] **Step 3: Implement canonical syllabus operations**

Delete `level` from syllabus DTOs and parser allowlists. Resolve create/update scope using `{ semesterId, semesterLevelId }`, query with `semesterLevelId`, and derive labels from the included relation. Remove all `level: true`, `level: syllabus.level`, and `...(level && { level })` clauses.

- [ ] **Step 4: Verify GREEN**

Repeat focused commands. Expected: selected tests pass and no syllabus request, response, or Prisma data object exposes the mirror.

### Task 4: Canonical Exam and Score Domain

**Files:**
- Modify: `server/types/exam.types.ts`
- Modify: `server/security/exam-input.ts`
- Modify: `server/controllers/exam.controller.ts`
- Modify: `server/service/exam.service.ts`
- Modify: `server/routes/exam.routes.ts`
- Modify: `server/tests/security/exam-controller-behavior.test.ts`
- Modify: `server/tests/security/exam-score-integrity.test.ts`
- Modify: `server/tests/security/exam-authorization.test.ts`
- Modify: `server/tests/security/assessment-cycle.test.ts`
- Modify: `client/src/types/exam.ts`
- Modify: `client/src/hooks/useExamQueries.ts`
- Modify: `client/src/types/api.ts`
- Modify: `client/src/tests/pages/exam-workspace.test.ts`

**Interfaces:**
- Consumes/produces: exam create/update/list and score validation use `semesterLevelId`; exam names continue to use catalog display metadata.

- [ ] **Step 1: Write failing exam tests**

Require canonical writes and filters:

```ts
assert.equal(createData.semesterLevelId, "semester-level-1");
assert.equal("level" in createData, false);
assert.deepEqual(listWhere, { semesterLevelId: "semester-level-1" });
```

Parser tests must reject `level` and require `semesterLevelId` for creates.

- [ ] **Step 2: Verify RED**

Run from `server`: `npm test -- tests/security/exam-controller-behavior.test.ts tests/security/exam-score-integrity.test.ts tests/security/exam-authorization.test.ts tests/security/assessment-cycle.test.ts`

Run from `client`: `npm run test:run -- src/tests/pages/exam-workspace.test.ts`

Expected: failures identify exam dual writes, selects, and level-code filtering.

- [ ] **Step 3: Implement canonical exam behavior**

Delete `level` from exam DTOs, input allowlists, query filters, selects, mutations, and score enrichment. Use `semesterLevelId` for all scope comparisons and the included academic level for labels.

- [ ] **Step 4: Verify GREEN**

Repeat focused commands. Expected: selected tests pass without legacy exam fields.

### Task 5: Attendance, Authorization, and Reporting Consumers

**Files:**
- Modify: `server/service/student-attendance.service.ts`
- Modify: `server/service/attendance.service.ts`
- Modify: `server/types/student-attendance.types.ts`
- Modify: `server/types/attendance.types.ts`
- Modify: `server/tests/security/student-attendance-authorization.test.ts`
- Modify: `server/tests/security/attendance-authorization.test.ts`
- Modify: `server/tests/security/authorization.test.ts`
- Modify: `server/tests/security/user-selects.test.ts`
- Modify: `server/tests/security/user-service-selects.test.ts`
- Modify: maintained report scripts under `server/scripts/` that query operational level columns

**Interfaces:**
- Consumes: related assignment/enrollment/exam `semesterLevelId` and `semesterLevel.academicLevel`.
- Produces: authorization scopes and reports with canonical IDs plus relation-derived display labels.

- [ ] **Step 1: Write failing consumer tests**

Change authorization assertions to compare canonical IDs:

```ts
assert.equal(scope.semesterLevelId, "semester-level-1");
assert.equal("level" in scope, false);
```

Update select tests so operational records select `semesterLevelId` and `semesterLevel`, never `level`.

- [ ] **Step 2: Verify RED**

Run from `server`: `npm test -- tests/security/student-attendance-authorization.test.ts tests/security/attendance-authorization.test.ts tests/security/authorization.test.ts tests/security/user-selects.test.ts tests/security/user-service-selects.test.ts`

Expected: failures expose remaining level-based selects and authorization scope values.

- [ ] **Step 3: Implement canonical consumers**

Remove operational `level` selects and response projections. Preserve report labels with:

```ts
const levelName = record.semesterLevel.academicLevel.name;
```

Do not add a compatibility `level` property; use an explicitly named display field where a report format needs one.

- [ ] **Step 4: Verify GREEN**

Repeat the focused command. Expected: selected tests pass and authorization comparisons use canonical IDs.

### Task 6: Guarded Prisma Contract Migration

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260817120000_contract_managed_semester_levels/migration.sql`
- Replace/retire: `server/scripts/backfill-semester-levels.ts`
- Replace/retire: `server/scripts/verify-semester-level-parity.ts`
- Modify: `server/tests/operations/semester-level-backfill.test.ts`
- Modify: `server/package.json`
- Regenerate: `server/generated/prisma/**`

**Interfaces:**
- Produces: required canonical columns for enrollment/syllabus/exam, nullable canonical assignment column, canonical unique/index constraints, and no compatibility columns.

- [ ] **Step 1: Write failing migration/preflight tests**

Replace parity tests with canonical integrity fixtures that count null, orphaned, and cross-semester references. Assert invalid state returns a nonzero result before contract SQL is safe to run:

```ts
assert.deepEqual(report.tables.Exam, {
  missingSemesterLevelIds: 1,
  orphanedSemesterLevelIds: 0,
  crossSemesterLevelIds: 0,
});
assert.equal(exitCode, 1);
```

- [ ] **Step 2: Verify RED**

Run from `server`: `npm test -- tests/operations/semester-level-backfill.test.ts`

Expected: existing legacy parity report does not implement canonical-only integrity checks.

- [ ] **Step 3: Implement schema and migration**

Change schema fields to:

```prisma
semesterLevelId String
semesterLevel SemesterLevel @relation(
  fields: [semesterLevelId, semesterId],
  references: [id, semesterId],
  onDelete: Restrict
)
```

for enrollment, syllabus, and exam; keep assignment nullable. Replace syllabus/exam unique/index definitions with `semesterLevelId`. Migration SQL uses a guarded PostgreSQL `DO $$ ... $$` preflight that raises an exception for any invalid count, then drops old indexes/constraints, alters canonical columns `SET NOT NULL`, creates canonical constraints/indexes, and drops each `level` column.

Replace backfill/parity package scripts with `db:verify:semester-level-integrity`; retain no runtime query that selects a removed column. Run `npx prisma format`, `npx prisma validate`, and `npx prisma generate`.

- [ ] **Step 4: Verify GREEN**

Run from `server`: `npm test -- tests/operations/semester-level-backfill.test.ts`

Run: `npx prisma validate`

Run: `npm run build`

Expected: canonical preflight tests pass, schema validates, generated client has no four operational `level` fields, and the server builds.

### Task 7: Documentation, Full Verification, and Runtime Scan

**Files:**
- Modify: `README.md`
- Modify: `server/API_DOCS.md`
- Modify: `docs/OPERATIONS_MANAGED_LEVELS.md`
- Modify: affected non-historical tests and fixtures found by the runtime scan

**Interfaces:**
- Produces: current documentation and tests describing the canonical-only contract.

- [ ] **Step 1: Update current documentation and remaining fixtures**

Document `semesterLevelId` as the sole operational level reference, the coordinated migration sequence, the canonical integrity command, and the breaking removal of legacy request/response fields and level-code routes. Leave historical migrations/specs/plans unchanged.

- [ ] **Step 2: Run production dependency scans**

Run from repository root:

```powershell
rg -n "resolveLegacyLevelCode|Semester level does not match legacy level|Compatibility mirror|legacy level|legacy-code" server client README.md docs/OPERATIONS_MANAGED_LEVELS.md --glob '!generated/**' --glob '!prisma/migrations/20260722120000_expand_managed_semester_levels/**'
rg -n "\blevel\s+String|\blevel\s+Level|\.level\b|\blevel:" server --glob '*.ts' --glob '*.prisma' --glob '!tests/**' --glob '!generated/**' --glob '!prisma/seed*.ts'
```

Expected: the first command has no current-runtime matches; every second-command match is reviewed and is either catalog/display terminology or removed.

- [ ] **Step 3: Run complete verification**

Run from `server`: `npm test`

Run from `server`: `npm run build`

Run from `server`: `npx prisma validate`

Run from `client`: `npm run test:run`

Run from `client`: `npm run lint`

Run from `client`: `npm run build`

Run from repository root: `git diff --check`

Expected: all commands exit 0 with no test failures, type errors, lint errors, Prisma errors, or whitespace errors.

- [ ] **Step 4: Inspect final scope**

Run: `git status --short`, `git diff --stat`, and `git diff`.

Expected: only managed-level hard-cutover code, tests, migration, generated Prisma artifacts, and current documentation changed; unrelated user files remain untouched.
