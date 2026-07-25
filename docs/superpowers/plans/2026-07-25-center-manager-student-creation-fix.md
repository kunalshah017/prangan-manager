# Center Manager Student Creation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an exact-scope Center Manager to create and enroll a student from the semester dashboard using the route-derived workspace IDs and selected `semesterLevelId`.

**Architecture:** Keep the client form and authorization model unchanged. Align the student-create controller's enrollment input validation with the existing enrollment controllers, which accept either the canonical `semesterLevelId` or a legacy `level`. Resolve the level before mutation and use the student service's existing nested enrollment create so the profile and enrollment commit atomically.

**Tech Stack:** TypeScript, Fastify, Prisma, Node test runner, React

---

### Task 1: Reproduce the Semester-Level Contract Failure

**Files:**
- Modify: `server/tests/security/student-hierarchy-controller.test.ts`

- [x] **Step 1: Change the matching-manager test to submit the client payload**

In `non-admin student creation requires an enrollment, and a matching manager may create one`, submit an enrollment without the legacy `level` and capture the Prisma enrollment write:

```ts
let enrollmentCreateData: Record<string, unknown> | undefined;

prisma.students.create = (async (query: {
  data: {
    enrollments?: {
      create?: Record<string, unknown>[];
    };
  };
}) => {
  enrollmentCreateData = query.data.enrollments?.create?.[0];
  return {
    id: "student-1",
    enrollments: [{ id: "enrollment-1", ...enrollmentCreateData }],
  };
}) as typeof prisma.students.create;

await addStudent(
  {
    user: { id: "user-1", role: Role.USER },
    body: {
      name: "Enrolled Student",
      enrollment: {
        projectId: studentScope.projectId,
        centerId: studentScope.centerId,
        semesterId: studentScope.semesterId,
        semesterLevelId: studentScope.semesterLevelId,
      },
    },
  } as any,
  allowedResponse.reply as any,
);

assert.equal(allowedResponse.statusCode, 201);
assert.equal(createdStudents, 1);
assert.equal(
  enrollmentCreateData?.semesterLevelId,
  "semester-1-level-1",
);
assert.equal(enrollmentCreateData?.level, Level.LEVEL_1);
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx tsx --test tests/security/student-hierarchy-controller.test.ts
```

Expected: the matching-manager creation case fails with status `400` instead of `201` because `addStudent` still requires `enrollment.level`.

### Task 2: Align Student Creation With the Enrollment Contract

**Files:**
- Modify: `server/controllers/user.controller.ts`
- Test: `server/tests/security/student-hierarchy-controller.test.ts`

- [x] **Step 1: Accept either canonical or legacy level input**

Change the local enrollment request type and validation in `addStudent`:

```ts
enrollment?: {
  centerId: string;
  semesterId: string;
  projectId: string;
  semesterLevelId?: string;
  level?: Level;
};
```

Require the three hierarchy IDs and at least one level reference:

```ts
if (
  !data.enrollment.centerId ||
  !data.enrollment.semesterId ||
  !data.enrollment.projectId ||
  (!data.enrollment.semesterLevelId && !data.enrollment.level)
) {
  return errorHandle(
    "All enrollment fields (centerId, semesterId, projectId, and semesterLevelId or level) are required when enrollment is provided.",
    reply,
    400,
  );
}
```

Validate the legacy enum only when it is present:

```ts
if (
  data.enrollment.level &&
  !Object.values(Level).includes(data.enrollment.level)
) {
  return errorHandle("Invalid level provided in enrollment.", reply, 400);
}
```

- [x] **Step 2: Resolve the level and create the enrollment atomically**

Resolve the supplied level before creating the student, map service errors to
their public status, and include the normalized enrollment in `studentData`:

```ts
const semesterLevel = await resolveSemesterLevelInput(data.enrollment);
resolvedEnrollment = {
  centerId: data.enrollment.centerId,
  semesterId: data.enrollment.semesterId,
  projectId: data.enrollment.projectId,
  semesterLevelId: semesterLevel.id,
  level: semesterLevel.academicLevel.code as Level,
};
```

Add this field to the existing `studentData` object:

```ts
enrollments: resolvedEnrollment ? [resolvedEnrollment] : undefined,
```

- [x] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
npx tsx --test tests/security/student-hierarchy-controller.test.ts
```

Expected: all tests in the file pass, including the Center Manager request with `semesterLevelId` and no legacy `level`.

- [x] **Step 4: Reject invalid semester levels before mutation**

Add a regression that makes `semesterLevel.findFirst` return `null`, submits a
canonical `semesterLevelId`, and asserts status `422` with zero calls to
`prisma.students.create`.

### Task 3: Verify the Complete Change

**Files:**
- Verify: `server/controllers/user.controller.ts`
- Verify: `server/tests/security/student-hierarchy-controller.test.ts`
- Verify: `client/src/pages/students/CreateStudent.tsx`

- [x] **Step 1: Run all server tests**

```bash
npm test
```

Expected: all server tests pass.

- [x] **Step 2: Build the server**

```bash
npm run build
```

Expected: TypeScript compilation and Prisma asset copying succeed.

- [x] **Step 3: Run the complete client verification**

From `client/`:

```bash
npm run test:run
npm run lint
npm run build
```

Expected: all client tests, lint, TypeScript compilation, and Vite production build pass.

- [x] **Step 4: Check repository hygiene**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only the intended controller, test, spec, and plan files are modified.
