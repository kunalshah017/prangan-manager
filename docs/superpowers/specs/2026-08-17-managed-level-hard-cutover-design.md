# Managed Level Hard Cutover Design

## Goal

Make `semesterLevelId` the only operational level reference throughout the
application and database. Remove the compatibility `level` columns and all API,
service, client, test, script, and documentation behavior that depends on them.

This fixes user-management updates that currently submit a canonical semester
level together with a stale compatibility value and fail with `Semester level
does not match legacy level`.

## Scope

The hard cutover removes the compatibility `level` field from these records:

- `UserRoleAssignments`
- `StudentEnrollments`
- `Syllabus`
- `Exam`

`AcademicLevel.code` remains. It is catalog metadata used for stable labels and
external presentation; it is not an operational foreign key. All operational
authorization, filtering, uniqueness, and joins use `semesterLevelId` and the
`SemesterLevel` relation.

Legacy `level` request parameters and response properties are removed rather
than translated. This is an intentional breaking API change. The maintained
client is updated in the same change.

## Root Cause

The managed-level rollout introduced `semesterLevelId` while retaining text
`level` columns as compatibility mirrors. Several write paths still accept both
values, call `resolveSemesterLevelInput`, and reject the request when the
selected semester level's `AcademicLevel.code` differs from the stale mirror.

The user-management flow is one instance of the systemic problem:

1. The client edits an educator assignment using `semesterLevelId`.
2. A legacy `level` value can remain in the assignment object or persisted row.
3. `bulkUpdateUserAssignments` normalizes both values.
4. `resolveSemesterLevelInput` compares the canonical relation with the mirror.
5. The mismatch becomes a server error instead of accepting the canonical ID.

Removing the mirror eliminates the competing sources of truth.

## Data Model

### Canonical references

- `StudentEnrollments.semesterLevelId`, `Syllabus.semesterLevelId`, and
  `Exam.semesterLevelId` become required.
- `UserRoleAssignments.semesterLevelId` stays nullable because non-educator and
  non-semester-scoped assignments do not have a level. Application validation
  requires it whenever an educator assignment is level-scoped.
- Existing composite relations from `(semesterLevelId, semesterId)` to
  `SemesterLevel(id, semesterId)` remain authoritative.

### Constraints and indexes

Every unique constraint or index containing `level` is rebuilt with
`semesterLevelId`. Existing `semesterLevelId` indexes are retained only when
they are not made redundant by a replacement composite index.

The migration must abort before destructive statements if any required record
has a null `semesterLevelId`, references a missing semester level, or references
a semester level from another semester. It must report counts by affected table
so operators can run the existing managed-level backfill and parity checks
before retrying. The migration never guesses mappings and never deletes
operational records.

After the preconditions pass, the migration updates constraints, marks required
canonical columns non-null, and drops the four compatibility columns.

## Server Behavior

All request contracts use `semesterLevelId` only. Controllers reject a legacy
`level` property as an unsupported field where strict body validation exists;
they do not silently use it.

Level resolution has one canonical operation: verify that a supplied
`semesterLevelId` belongs to the supplied semester and is active when the
operation requires an active level. `resolveLegacyLevelCode` and dual-input
comparison logic are removed.

Services stop dual-writing and stop selecting/filtering by compatibility text:

- role assignments store and compare `semesterLevelId`;
- enrollments authorize and filter through `semesterLevelId`;
- syllabi use `semesterLevelId` for scope and uniqueness;
- exams use `semesterLevelId` for scope and uniqueness;
- attendance and score checks derive level scope from the related enrollment or
  exam canonical ID.

Responses that need a human-readable level include the existing
`semesterLevel.academicLevel` relation. They do not synthesize a legacy `level`
field.

Missing canonical IDs produce a client error. Invalid, inactive, cross-semester,
or orphaned IDs produce the existing managed-level validation error class and
an HTTP 422 response. Expected validation errors must not be converted to HTTP
500 by management service string handling.

## Client Behavior

Client request and response types remove deprecated `level` properties from
managed records. User editing, registration approval, enrollment, syllabus,
exam, dashboard, attendance, and score workflows submit and compare
`semesterLevelId` only.

Display text comes from `semesterLevel.academicLevel.name` or its existing label
helper. Code-to-ID fallback maps are removed, including dashboard fallback logic
that currently resolves records with only a compatibility code.

Cached server data from an older deployment is invalidated by the normal
deployment/version lifecycle. The client does not preserve support for stale
response shapes after this hard cutover.

## Scripts and Documentation

The old expand/backfill/parity workflow is retired from normal operations after
the contract migration. Any retained preflight tool verifies canonical IDs and
relations only. Seed data, reports, and maintenance queries join through
`SemesterLevel` and `AcademicLevel` when they need a level label.

API documentation removes legacy request/response examples and level-code route
contracts that address operational records by compatibility code. Repository
documentation states that `semesterLevelId` is the sole operational reference.

Historical design documents and already-applied migrations are not rewritten.
They are historical artifacts, not runtime dependencies.

## Testing Strategy

Implementation follows red-green-refactor cycles.

1. Add a regression reproducing the user-management update with a canonical
   `semesterLevelId` and no compatibility field; assert a successful assignment
   reconciliation and canonical write.
2. Add service tests proving role assignments, enrollments, syllabi, and exams
   accept canonical IDs, emit no compatibility writes, and use canonical IDs in
   filters and uniqueness behavior.
3. Add controller/client contract tests proving maintained requests contain
   `semesterLevelId` and no legacy `level` property.
4. Add migration verification against representative valid and invalid data,
   proving invalid canonical state aborts before columns are dropped.
5. Update existing security and hierarchy tests to build complete canonical
   fixtures and assert real behavior rather than source-text mirrors where
   practical.

Verification includes focused regressions, the complete server test suite,
server build and Prisma validation/generation, client tests, client lint/build,
migration inspection, `git diff --check`, and a production-source scan for the
removed fields and legacy resolver. Any remaining occurrence must be either an
explicitly documented historical artifact or unrelated presentation/report
terminology.

## Deployment

This is a coordinated breaking deployment:

1. Back up the production database.
2. Run the canonical-data preflight and existing backfill tooling until all
   required rows have valid `semesterLevelId` relations.
3. Put writes behind the normal deployment maintenance boundary.
4. Apply the contract migration and deploy the server/client build together.
5. Run post-deploy canonical integrity checks and exercise user level updates,
   enrollment changes, syllabus edits, and exam edits.

Rollback restores the database backup and the previous application release as a
pair. The dropped compatibility columns are not reconstructed from partial
runtime state.

## Non-Goals

- Removing `AcademicLevel.code` from the managed catalog.
- Reworking the academic-level ordering or semester-level administration UI.
- Rewriting historical migrations or archived design documents.
- Supporting unmaintained clients that still send or expect legacy `level`
  fields.
