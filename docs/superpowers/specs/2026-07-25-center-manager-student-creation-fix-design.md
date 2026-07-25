# Center Manager Student Creation Fix

## Problem

The semester-scoped student form submits its workspace context from the route:
`projectId`, `centerId`, and `semesterId`. It also submits the selected
`semesterLevelId`. The student-create controller still validates the legacy
`level` field and omits `semesterLevelId` when it calls the enrollment service,
so valid Center Manager requests are rejected before enrollment.

## Design

Keep the current student form unchanged. Project, center, and semester remain
implicit because the form is already nested under the semester dashboard.

Update the student-create controller to use the same enrollment contract as the
existing enrollment controllers:

- Require project, center, semester, and either `semesterLevelId` or legacy
  `level`.
- Validate `level` only when a legacy level is provided.
- Resolve the selected semester level before any student mutation.
- Create the student and resolved enrollment with the existing nested Prisma
  create so both records commit atomically.
- Preserve exact-scope Center Manager authorization and hierarchy validation.
- Preserve legacy clients that still submit `level`.

## Error Handling

Incomplete enrollment requests continue to return `400`. Requests outside the
Center Manager's active exact assignment continue to return `403`. The
semester-level service remains responsible for rejecting a missing, inactive,
or mismatched semester level before the student is created.

## Verification

Add a controller regression test that submits the same enrollment shape as the
student form: route-derived project, center, and semester IDs plus
`semesterLevelId`, without a legacy `level`. The test must prove that a matching
Center Manager receives `201`, the student is created once, and the enrollment
write receives the selected semester level. A second regression must prove an
invalid semester level returns `422` without creating a student. Run the
focused server test, complete server test suite, client tests, lint, and
production builds.
