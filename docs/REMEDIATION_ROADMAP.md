# Prangan Manager Remediation Roadmap

**Created:** 2026-07-11
**Status:** Repository-controlled security, operations, dependency, authentication, and shared accessibility remediation complete
**Deployment target:** Azure App Service (Vercel server path is retired)

## Objective

Repair the application's security and data-integrity foundations without breaking valid administrator or assigned-user workflows. Work is divided into independently testable phases. Security boundaries and regression tests come before broad rewrites.

## Priority Definitions

- **P0 - Incident response:** complete immediately outside the normal release cycle.
- **P1 - Security core:** implement before further feature development.
- **P2 - Integrity and reliability:** implement after the security core is covered by tests.
- **P3 - performance and maintainability:** implement using measured query and browser behavior.
- **P4 - experience and accessibility:** complete after shared UI primitives are stabilized.

## Work Register

| ID  | Finding                                                               | Priority | Decision                                                                                                                                                                                          | Verification                                                                                   |
| --- | --------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Plaintext production database URL in two untracked scripts            |       P0 | Remove literals immediately. Rotate the Neon owner credential manually and verify it was never committed.                                                                                         | Secret scan returns no live connection URL.                                                    |
| 2   | Users can update their own role assignments                           |       P0 | Self-service profile updates will use an allowlist and reject role or assignment fields. Assignment mutations remain admin-only.                                                                  | Non-admin self-assignment test returns 403; profile edits still pass.                          |
| 3   | Authenticated `/users` exposes password hashes and financial PII      |       P0 | Make the endpoint admin-only and use explicit public/admin/current-user DTOs. Add a separate minimal dashboard summary later.                                                                     | Response-contract tests prove excluded fields.                                                 |
| 4   | Authentication is used as authorization across core routes            |       P1 | Add shared role-and-scope policies. Writes become strict immediately. Reads are scoped when context is present; ambiguous reads are migrated feature by feature.                                  | Matrix tests cover admin, assigned user, wrong center, inactive assignment, and ordinary user. |
| 5   | Rejected users retain valid tokens                                    |       P0 | Authentication must reload and require `APPROVED` status on every request. Session versioning is staged for later if immediate global revocation is needed beyond status changes.                 | Rejected-user token test returns 401.                                                          |
| 6   | Exam scores and attendance allow mismatched contexts                  |       P1 | Validate the complete user/student, assignment/enrollment, project, center, semester, level tuple inside transactions.                                                                            | Cross-context requests fail without writes; valid requests pass.                               |
| 7   | Negative or inconsistent exam marks are accepted                      |       P1 | Validate finite, nonnegative component scores, maximums, and calculated totals in the service. Add database checks in a safe migration phase.                                                     | Boundary tests cover negative, NaN-like input, over-max, absent, and valid scores.             |
| 8   | Service worker caches authenticated API data                          |       P0 | Bypass all API and authorization-bearing requests and purge the old runtime cache version.                                                                                                        | Service-worker logic test/manual browser check shows API responses are never cached.           |
| 9   | Vercel route drift                                                    |   Closed | Server is Azure-only. Remove the unused Vercel server entry/config after confirming Azure packaging does not reference them.                                                                      | Azure build and route smoke tests pass after deletion.                                         |
| 10  | Unsafe historical migrations                                          |       P2 | Do not rewrite applied migration history. Add a migration policy and use expand/backfill/validate/contract for all future changes. Check production status with an approved read-only connection. | Disposable PostgreSQL migration replay and production status review.                           |
| 11  | Destructive seed with fixed credentials                               |       P1 | Separate local reset fixtures from additive seed data, hard-fail outside development, and remove known passwords from documentation.                                                              | Production-like URL test refuses to run; local fixture test succeeds transactionally.          |
| 12  | Vulnerable dependencies                                               |    P1/P2 | Upgrade patched direct dependencies with regression tests. Replace or isolate `xlsx`, which has no npm fix. Do not use blind `npm audit fix --force`.                                             | Lockfile audit plus build, tests, report-generation smoke checks.                              |
| 13  | Ten independent Prisma clients                                        |       P1 | Introduce one process-wide Prisma client module and migrate imports.                                                                                                                              | Source scan finds one constructor; server build and route tests pass.                          |
| 14  | JWT and financial profile persisted in local storage                  |       P2 | First centralize logout/cache clearing and minimize persisted profile. Then migrate bearer JWT to an HttpOnly secure cookie with an explicit CSRF policy.                                         | Shared-browser account-transition tests and cookie security checks.                            |
| 15  | Login accepts a password in the URL                                   |       P0 | Remove password query support. Email-only prefill remains for approval emails. Replace password links with one-time activation/reset tokens in the account lifecycle phase.                       | Login test ignores `password` query and still accepts `email`.                                 |
| 16  | Non-idempotent mutations retry automatically                          |       P0 | Disable retries globally for mutations. Opt in only for proven-idempotent operations or operations using idempotency keys.                                                                        | Query-client configuration test and create-flow smoke test.                                    |
| 17  | Weekend commitment selection is wrong                                 |       P1 | Saturday selects `SATURDAY` and `BOTH`; Sunday selects `SUNDAY` and `BOTH`.                                                                                                                       | Unit tests for Saturday, Sunday, and weekday.                                                  |
| 18  | Multi-write workflows are partially atomic and history can be deleted |       P2 | Move syllabus save, student-plus-enrollment, hierarchy deletion, and bulk data changes into server transactions. Restrict hard deletion of historical records.                                    | Failure-injection tests prove rollback.                                                        |
| 19  | Unbounded and N+1 reads                                               |       P3 | Add bounded pagination and database aggregation first; use server exports and PDF virtualization where full datasets are required. Optimize only after row counts and query plans are available.  | Query-count, response-size, and browser-memory benchmarks.                                     |
| 20  | Required controls and modals are inaccessible                         |       P4 | Repair shared upload and modal primitives first, then audit feature pages for keyboard, focus, labeling, and announcements.                                                                       | Automated accessibility checks plus keyboard walkthrough.                                      |

## Immediate Release Scope

The first release contains IDs 1, 2, 3, 5, 8, 13, 15, and 16, plus the authorization foundation required by ID 4. It also adds the first executable server tests. This release does not alter historical migrations or move authentication to cookies.

## Phase 1A Completion Record

**Completed on:** 2026-07-11

| Area                | Verified result                                                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Credential source   | Removed plaintext Neon URLs from both local exam scripts; application-source secret scan is clean. Credential rotation remains a manual P0 action.                                                                                                                                               |
| Database client     | Runtime controllers, services, and utilities use one process-wide Prisma client. The constructor scan finds only `server/lib/prisma.ts`.                                                                                                                                                         |
| Authentication      | Every request reloads the user and accepts only `APPROVED` accounts. All authentication failures return the same generic 401 response.                                                                                                                                                           |
| User data           | Passwords are absent from all response selectors. Global user listings are administrator-only and exclude bank/UPI data. Owner, administrator-detail, context-staff, and remuneration payloads have separate explicit selectors.                                                                 |
| Assignment security | The general profile endpoint uses a strict runtime allowlist and cannot mutate role, status, assignments, reimbursement, or bank fields. Privilege changes remain behind administrator-only management endpoints.                                                                                |
| Scoped reads added  | Dashboard staff and remuneration users use exact project, center, and semester authorization. Nested context assignments are filtered to that same scope.                                                                                                                                        |
| Existing workflows  | Administrator user editing, ordinary self-profile editing, DOB clearing, current-user bank display, scoped staff birthdays/counts, remuneration, and attendance exports were preserved through dedicated contracts. Historical attendance payees remain available after assignment deactivation. |
| Client sessions     | Logout, login failure, API 401, and account switching clear all auth storage and protected query data. A mounted QueryObserver regression test proves account A cannot be rebound to account B's token, and a delayed 401 from account A cannot clear account B.                                 |
| Login links         | Approval links may prefill email only. Password query parameters are never read or applied.                                                                                                                                                                                                      |
| Mutations           | Failed mutations execute once by default; query retry behavior and explicit local mutation overrides remain supported.                                                                                                                                                                           |
| Service worker      | API and authorization-bearing requests bypass interception. Versioned activation removes old Prangan static/runtime caches while preserving current, PDF, and unrelated caches.                                                                                                                  |
| Validation baseline | Server: 47 tests, build, and Prisma schema validation passed. Client: 42 tests, lint, production build, worker syntax, and source/build worker parity passed.                                                                                                                                    |

### Deferred From Phase 1A

- Endpoint-by-endpoint authorization remains Phase 1B. Attendance, student attendance, exams, syllabus, projects, centers, semesters, and student management must enforce server-side role and exact assignment scope.
- Administrative profile, role, and assignment updates are still multiple writes. Phase 2 will replace them with one transactional server operation.
- Assignment enum validation and full cross-context attendance/exam integrity validation remain Phase 1B.
- Bearer tokens and the current profile remain persisted until the HttpOnly cookie migration in Phase 2.
- No production database was queried. Migration status, schema drift, backup/PITR readiness, and existing corrupt records remain unverified.

### Phase 1B Attendance Completion Record

**Completed on:** 2026-07-17

| Area                      | Verified result                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User attendance           | Active users, single mark, bulk mark, records, summary, and auto-mark now authorize before services run. Non-admin callers require an exact active `CENTER_MANAGER` assignment for the full project, center, and semester scope. Administrators retain existing broad reporting behavior. Saturday selects `SATURDAY` and `BOTH`; Sunday selects `SUNDAY` and `BOTH`.                                                            |
| User attendance integrity | Single and bulk writes validate submitted role assignments are active, belong to the submitted user, match the exact scope, and are `EDUCATOR` or `CENTER_MANAGER` before persistence. Bulk results now distinguish committed preflight partial failures from atomic write failures.                                                                                                                                             |
| Student attendance        | Exact active `CENTER_MANAGER` assignments manage every level in scope. Exact active `EDUCATOR` assignments are limited server-side to their assigned enrollment levels for reads, creates, bulk creates, history, statistics, update, and delete. A committed bulk transaction returns successful attendance results with `Unknown` student details when post-commit enrichment fails.                                           |
| Stored-record mutations   | Student-attendance update and delete resolve the persisted record's project, center, semester, and enrollment level before authorization. Out-of-scope callers receive `403` without mutation.                                                                                                                                                                                                                                   |
| Request boundary          | User-attendance and student-attendance create, bulk, and update bodies are runtime-parsed. Invalid bodies, invalid statuses, malformed IDs, calendar-invalid dates, invalid holiday metadata, and linkage-field mass assignment are rejected with `400` before services run. Attendance date filters and date views require real UTC calendar dates in `YYYY-MM-DD` format. Non-holiday transitions clear stale holiday reasons. |
| Public errors             | User-attendance and student-attendance controllers log internal failures but no longer expose raw Prisma, transaction, or deployment details to clients.                                                                                                                                                                                                                                                                         |
| Validation baseline       | Server: 138 tests, production build, and Prisma schema validation passed.                                                                                                                                                                                                                                                                                                                                                        |

### Remaining Phase 1B Work

- Reconcile the remaining stale API documentation after all protected-domain route contracts are covered.
- Complete measured performance work only after collecting production row counts, query plans, response sizes, and browser traces.
- Complete the external production and Azure gates recorded below.

### Phase 1B Exam And Score Completion Record

**Completed on:** 2026-07-17

| Area                | Verified result                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exam authorization  | Administrators retain broad list access. Non-administrator reads require an exact active assignment in the exam's project, center, and semester. Create, update, and soft delete require an exact active `CENTER_MANAGER` or `CURRICULUM_MENTOR` assignment.               |
| Score authorization | Score reads derive exact scope from the associated exam. Score writes require an exact active `CENTER_MANAGER`, `CURRICULUM_MENTOR`, or level-matched `EDUCATOR` assignment. Administrator-only hard exam and score deletion returns `404` when the target does not exist. |
| Score integrity     | Every write requires an active exam and an exact active `(enrollmentId, studentId)` pair matching the exam project, center, semester, and level. Bulk pairs are preflighted before any transaction.                                                                        |
| Score values        | Raw score requests are parsed before use. Components must be finite, nonnegative, and bounded by the exam maxima; totals are server-derived; absence writes all score components and totals as zero.                                                                       |
| Public errors       | Exam and score controllers return stable public errors. Dynamic enrollment identifiers, Prisma details, and raw validation text remain server-side.                                                                                                                        |
| Query behavior      | Exam lists honor the existing `cycle` filter; statistics never report a negative pending-score count.                                                                                                                                                                      |
| Validation baseline | Server: 132 tests, production build, and Prisma schema validation passed.                                                                                                                                                                                                  |

### Phase 1B Syllabus And Topic Completion Record

**Completed on:** 2026-07-17

| Area                    | Verified result                                                                                                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Syllabus authorization  | Administrators retain broad reads. Non-administrator reads require an exact active assignment in the persisted or requested scope. Create, update, soft-delete, topic create/update/reorder/delete require exact active `CENTER_MANAGER` or `CURRICULUM_MENTOR` scope. |
| Topic status            | Exact level-matched educators can update topic status only in their assigned scope; managers and mentors can update any level in their exact scope.                                                                                                                    |
| Hierarchy integrity     | Parent topics must belong to the target syllabus. Bulk creation validates parents before its transaction. Reorder rejects duplicate, missing, and mixed-syllabus topic IDs before writes.                                                                              |
| Query and DTO contracts | Root-topic queries no longer emit `parentId=` from the client. Progress-log date bounds are independently supported and date-only end bounds are inclusive UTC. Progress logs expose `updatedByUser`, matching the client contract.                                    |
| Import and delete       | Hard syllabus deletion is administrator-only and missing targets return `404`. Template import is authorized for exact-scope curriculum mentors and remains explicitly `501` until templates are implemented.                                                          |
| Validation baseline     | Server: 170 tests, production build, and Prisma schema validation passed. Client: 45 tests, lint, and production build passed.                                                                                                                                         |

### Phase 1B Student And Context Hierarchy Completion Record

**Completed on:** 2026-07-17

| Area                 | Verified result                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resource details     | Project, center, and semester detail routes resolve persisted context before authorization. Assigned users can read only resources referenced by their active assignments.                       |
| Student details      | Non-administrator student detail and enrollment-history responses include only active enrollment tuples that exactly match the caller's assignment; educators are level-bound.                   |
| Student mutation     | Non-administrator student creation requires a complete, exact center-manager enrollment scope. Student profile updates require the same active center-manager scope.                             |
| Enrollment hierarchy | Enrollment creation and partial updates validate the effective merged project, center, semester, and level tuple before writes.                                                                  |
| Delete safety        | Project and center dependent deletes are transactional. Project, center, semester, and student deletion preserve enrollment history by returning stable `409` conflicts while enrollments exist. |
| Validation baseline  | Server: 200 tests, production build, and Prisma schema validation passed.                                                                                                                        |

### Operations And Data Safety Completion Record

**Completed on:** 2026-07-17

| Area                | Verified result                                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local fixtures      | The destructive reset is exposed only as `db:reset:fixtures`. It requires `NODE_ENV=development`, `ALLOW_LOCAL_SEED=true`, `ALLOW_DESTRUCTIVE_SEED=true`, and an operator-supplied `DEV_SEED_PASSWORD` before any Prisma client or data work starts. |
| Fixture integrity   | The reset clears dependent exam scores before enrollments and performs its entire cleanup in one transaction. Additive syllabus fixtures require the local environment confirmation but not the destructive confirmation.                            |
| Deployment path     | Retired server Vercel handler, configuration, build script, and runtime branch are removed. The independent client Vercel configuration remains unchanged.                                                                                           |
| Azure workflow      | CI uses `npm ci`, compiles the server, prunes development dependencies, and deploys a defined runtime artifact. Database migrations are not run during application deployment.                                                                       |
| Operations policy   | `docs/OPERATIONS.md` documents local fixture controls, immutable migration history, expand/backfill/validate/contract migration policy, and required Azure release checks.                                                                           |
| Validation baseline | Server: 203 tests, production build, Prisma schema validation, and `git diff --check` passed.                                                                                                                                                        |

### External Operations Gates

- Rotate the previously exposed Neon credential and invalidate its former password.
- Run `prisma migrate status` using an approved production connection.
- Confirm backup/PITR and a tested restore procedure before applying a production migration.
- Verify Azure App Service secrets, startup command, allowed client origins, logs, `/health`, and authenticated-route smoke checks after deployment.

### Dependency Remediation Completion Record

**Completed on:** 2026-07-17

| Area                | Verified result                                                                                                                                                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server packages     | Fastify, Fastify CORS, Nodemailer, JSON Web Token, and Cloudinary were updated within compatible supported ranges. Patched transitive validator and utility packages are pinned through npm overrides.                                                                                 |
| Client packages     | React Router was updated within 7.x, jsPDF was updated to 4.x, jsPDF AutoTable was updated, and Vite was updated within 7.x. Patched PostCSS, Rollup, and tar versions are pinned through client npm overrides.                                                                        |
| Spreadsheet parser  | The unpatched `xlsx` package was removed from both server and client dependency graphs. No source import or lockfile entry remains.                                                                                                                                                    |
| Attendance exports  | Spreadsheet exports now download formula-safe CSV files. Former workbook sheets download as individual CSV files, preserving their table data without representing pseudo-sheets or styling in a single CSV. PDF reports remain available for the styled, multi-section report format. |
| Validation baseline | Server: 203 tests, production build, Prisma schema validation, and zero production audit findings. Client: 250 tests, lint, production build, and zero production audit findings.                                                                                                      |

### Authentication Lifecycle Completion Record

**Completed on:** 2026-07-17

| Area                | Verified result                                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessions            | Login uses an eight-hour HttpOnly session cookie containing the user ID and session version. The browser no longer persists or attaches a bearer token. Password activation/reset increments the version and invalidates prior sessions.             |
| CORS and CSRF       | Credentialed requests require an exact `CLIENT_ORIGIN` in production. Unsafe requests use an in-memory CSRF token that must match the HttpOnly CSRF cookie with timing-safe comparison.                                                              |
| Account lifecycle   | Approval creates a hashed, one-time activation token and sends the link to the persisted account email. Reset requests are generic even when email delivery fails. Tokens are single-use, expire in one hour, and are stored only as SHA-256 hashes. |
| Browser handling    | Cookie sessions restore through `/users/me`. Stale `401` responses from an old session generation cannot clear a newer session. Activation/reset URL tokens are captured once and removed from the browser URL before the form is displayed.         |
| Validation baseline | Server: 213 tests, production build, Prisma schema validation, and zero production audit findings. Client: 259 tests, lint, production build, and zero production audit findings.                                                                    |

### External Authentication Gates

- Configure the exact HTTPS client `CLIENT_ORIGIN`, `JWT_SECRET`, and production `NODE_ENV` in Azure App Service.
- Apply the account-token migration through the reviewed production migration procedure.
- Verify cookie attributes, CORS preflight, CSRF rejection, login/logout, activation, reset, and a valid-cookie browser refresh against the deployed client origin.

### Accessibility Completion Record

**Completed on:** 2026-07-17

| Area                | Verified result                                                                                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared modals       | The shared modal now exposes labelled `role="dialog"` semantics, restores focus on close, traps Tab/Shift+Tab, and supports Escape only when the consumer permits dismissal. Loading confirmation dialogs consistently block backdrop and Escape dismissal. |
| Shared uploads      | Image upload surfaces are keyboard-operable with Enter/Space. The mobile camera/gallery picker reuses the accessible shared modal. Nested remove-button keyboard events cannot reopen the file picker.                                                      |
| Validation baseline | Focused accessibility contracts pass. Client: 259 tests, lint, production build, and zero production audit findings.                                                                                                                                        |

### Client Role-Aware UX Remediation Record

**Completed slice:** 2026-07-18

| Area                    | Verified result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace access        | The client uses typed, scope-aware permissions for high-risk academic routes and score editing. Workspace menus now show only projects, centers, and semesters that match an active assignment; the server remains the authorization authority.                                                                                                                                                                                                                                                                                                                           |
| Account management      | A single owner Account Settings page combines personal details, profile photo, and payment details. Legacy bank routes redirect to its payment anchor. Account numbers are masked during entry; IFSC lookup fills bank details when available and keeps manual entry available when it is not.                                                                                                                                                                                                                                                                            |
| Image workflow          | Shared upload controls crop before upload, provide replace/remove commands, use a native keyboard-accessible trigger, and release crop-preview object URLs. The profile-image self-update allowlist is supported server-side.                                                                                                                                                                                                                                                                                                                                             |
| Operational workflows   | Registration rejection always enters the reason-and-confirmation flow. User center and semester filters render their fetched options. Score creation retains the returned record ID so subsequent edits update rather than recreate. Syllabus topic and subtopic creation rejects blank titles before the multi-write sequence begins. Staff attendance resolves an exact active assignment for the displayed project, center, and semester instead of using the first assignment in an array. Attendance failures retry their queries without a full application reload. |
| Query boundaries        | Contextual student, student-attendance, exam, and syllabus list queries accept explicit page-owned enablement. High-risk pages derive that flag from `can()` and the exact URL context. The client now permits exact-scope center managers to manage exams, matching the server policy.                                                                                                                                                                                                                                                                                   |
| Navigation and recovery | Invalid edit breadcrumbs return to valid list destinations. Unmatched URLs render a dedicated Not Found page. Desktop menus expose expanded state, labels, and Escape dismissal. Service-worker updates and cache recovery use the application confirmation/toast layer rather than native browser dialogs.                                                                                                                                                                                                                                                               |
| Reader performance      | Library covers load only as their cards near the viewport. The reader mounts a five-page window around the active page and starts with its index closed.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Test alignment          | Score-scope authorization coverage accepts Prisma's safe chained delegate syntax while still requiring only the persisted authorization fields.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Validation baseline     | Client: 72 tests across 25 files, lint, production build, and production dependency audit passed. Server: 214 tests, production build, and Prisma schema validation passed. `git diff --check` passed.                                                                                                                                                                                                                                                                                                                                                                    |

### Remaining Client UX Work

- Complete a broad sweep of lower-risk legacy role helpers after collecting role-journey evidence; high-risk routes, actions, and contextual queries now use the typed policy.
- Add Playwright role journeys for administrator, center manager, educator, curriculum mentor, and unassigned-user flows. This requires a deliberately initialized local fixture database and browser-test dependency; no credentials or destructive fixture command were run automatically.
- Measure deployed library/reader request counts, rendered-page memory, and production database query plans before changing server-side pagination or aggregation contracts.

### Structured Person Name Release 1 Record

**Completed in repository:** 2026-07-21

| Area                | Verified result                                                                                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data model          | `User` and `Students` have nullable `firstName`, `middleName`, and `lastName` expansion columns. Existing `name` remains the composed display and compatibility field.                                                                        |
| Server contract     | Registration, profile updates, administrator user editing, student create/update, fixtures, selectors, and bank-update responses preserve canonical parts. Legacy `name` requests remain supported during the compatibility window.           |
| Migration utility   | The operator-run backfill defaults to dry-run, uses deterministic 1/2/3/4+ token parsing, batches records, guards concurrent updates, and requires a protected non-overwriting report for apply mode.                                         |
| Client experience   | Registration, Profile, Edit User, Create Student, and Edit Student use one accessible first/middle/last field group. Only first name is required; optional fields can be cleared. Display surfaces continue using the server-composed `name`. |
| Validation baseline | Server: 237 tests, production build, and Prisma schema validation passed. Client: 165 tests, lint, production build, and desktop/mobile registration checks passed. `git diff --check` passed.                                                |

Production expansion, dry-run review, backfill, manual correction, client deployment, normalization, and the later required-`firstName` contract migration remain operator-controlled gates in `docs/OPERATIONS.md`.

### Performance Measurement Gate

- Capture production row counts, endpoint response sizes, Prisma query plans, browser memory, and route request counts before changing list pagination, aggregation, PDF rendering, or bundle splitting contracts.
- The repository contains unbounded list services and large production chunks, but no before/after production measurement exists to justify a behavior-changing pagination or rendering rewrite.

### Dependency Audit Baseline

| Package | Total | Critical | High | Notes                                                                                                                                   |
| ------- | ----: | -------: | ---: | --------------------------------------------------------------------------------------------------------------------------------------- |
| Server  |     8 |        0 |    6 | Direct High findings include Fastify and Nodemailer with fixes available; `xlsx` has no npm fix.                                        |
| Client  |    18 |        2 |    9 | Direct Critical findings include jsPDF/jsPDF-AutoTable. React Router, Vite, and `xlsx` are direct High findings; `xlsx` has no npm fix. |

Do not run a blind forced audit upgrade. Dependency remediation needs report-generation, routing, authentication, build, and Azure smoke tests.

## Second Release Scope

The second release completes strict feature authorization and data-integrity work: IDs 4, 6, 7, 11, 12 (safe upgrades), and 17. It adds route and service contract tests for every protected domain.

Implementation order:

1. Enforce exact server-side scope on attendance and student-attendance reads and writes.
2. Enforce scope and role policies on exams, scores, syllabi, topics, students, projects, centers, and semesters.
3. Validate complete relationship tuples, finite nonnegative marks, dates, pagination, and assignment enums.
4. Correct Saturday/Sunday commitment selection with unit coverage.
5. Guard destructive seeds and replace fixed credentials.
6. Upgrade patched dependencies in isolated batches; replace or isolate `xlsx`.

## Later Releases

- **Reliability:** IDs 10, 14, and 18.
- **Performance:** ID 19, driven by production row counts and query plans.
- **Accessibility:** ID 20, starting with shared primitives.

## Manual Actions Required

1. Rotate the exposed Neon database credential and invalidate the old password.
2. Provide an approved read-only production connection or run `prisma migrate status` operationally and record the result.
3. Confirm backups/PITR and test a restore before future schema changes.
4. Inventory existing active role assignments before strict scoped reads are enabled everywhere.

## Definition Of Done

A phase is complete only when its behavior tests fail before implementation, pass afterward, the server and client builds succeed, dependency findings are reviewed, and Azure route smoke tests pass. Documentation and environment templates must match deployed behavior.
