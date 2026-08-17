# Prangan Manager

Prangan Manager is the internal operations platform for Prangan Foundation's
education programs. It brings project administration, center operations,
semester planning, student records, attendance, curriculum, assessments,
payments, and classroom resources into one scoped workspace.

This repository is private. The handbook is intended for Prangan engineers,
administrators, and operators. Do not copy production credentials, database
URLs, private keys, user data, or protected reports into this file or any other
tracked document.

## Contents

- [What the application manages](#what-the-application-manages)
- [Organization and access model](#organization-and-access-model)
- [Core workflows](#core-workflows)
- [System architecture](#system-architecture)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database and Prisma](#database-and-prisma)
- [Development commands](#development-commands)
- [Testing and verification](#testing-and-verification)
- [Fixtures, seeds, and data tools](#fixtures-seeds-and-data-tools)
- [Authentication and security](#authentication-and-security)
- [API organization](#api-organization)
- [Frontend behavior](#frontend-behavior)
- [Deployment](#deployment)
- [Release checklist](#release-checklist)
- [Troubleshooting](#troubleshooting)
- [Internal documentation](#internal-documentation)
- [Maintaining this handbook](#maintaining-this-handbook)

## What the application manages

| Area | Current behavior |
| --- | --- |
| Administration | Reviews registrations, approves or rejects access, manages people, assignments, academic levels, projects, centers, and semesters. |
| Workspace hierarchy | Organizes work as Project -> Center -> Semester -> Semester level. |
| Semester setup | Creates draft semesters, prepares student and staff transition plans, sets scoped remuneration, and activates the new semester transactionally. |
| Students | Stores structured names, contact and family details, school information, career aspirations, images, and semester enrollments. |
| Staff | Assigns one or more scoped sub-roles with project, center, semester, level, committed days, and active status. |
| Student attendance | Marks weekend attendance, records holidays and notes, validates enrollment scope, and exports attendance records. |
| Staff attendance | Marks attendance against exact role assignments, tracks committed weekend days, and exports reports. |
| Curriculum | Creates syllabi by semester level and assessment cycle, groups topics and subtopics, records progress, and keeps an audit log. |
| Exams | Manages pre-assessment and SA cycles, LSRW marks, absences, bulk score entry, and assessment statistics. |
| Library | Provides level-aware books, searchable tables of contents, PDF page offsets, responsive reading, and local last-read-page recovery. |
| Remuneration | Stores effective-dated daily rates, calculates payable attendance, reports incomplete payment data, and records monthly payments. |
| Expenses | Keeps an admin-only semester ledger for manual expenses and remuneration payments with immutable source metadata and controlled voiding. |
| Accounts | Supports registration review, activation links, login sessions, logout, password reset, profile updates, and payment details. |
| Notifications | Uses a database-backed email outbox with deduplication, leases, retries, and stable message IDs. |
| Installability | Ships as a responsive PWA with install prompts, update recovery, and mobile navigation. |

## Organization and access model

### Workspace hierarchy

```text
Project
└── Center
    └── Semester
        ├── Semester levels
        ├── Students and enrollments
        ├── Staff assignments and remuneration rates
        ├── Student and staff attendance
        ├── Curriculum and progress
        ├── Exams and scores
        └── Expenses and payments
```

Academic levels are managed catalog records with stable IDs, administrator
defined codes, display names, and journey order. A semester selects the catalog
levels that are active for that semester. Operational records use
`semesterLevelId` as their only level reference; operational tables do not
retain compatibility mirrors.

### Roles and assignments

Every account has a primary role:

- `ADMIN` has application-wide access.
- `USER` receives access through one or more active role assignments.

A role assignment can be scoped to a project, center, semester, and semester
level. Access checks compare the full requested context with the assignment.
Missing or mismatched scope values are not treated as wildcards.

| Sub-role | Main application access |
| --- | --- |
| Center Manager | Views the assigned workspace; manages students; reads and writes student and staff attendance; manages exams and scores; reads curriculum; manages semester users in the exact assigned context. |
| Educator | Works only within the assigned project, center, semester, and level for level-sensitive student, attendance, curriculum, exam, and score operations. |
| Curriculum Mentor | Reads and manages curriculum, curriculum progress, exams, and scores within the assigned workspace. |
| Tech | Holds an assignment record but currently has no client workspace permissions in the central permission map. |
| Training & Development | Holds an assignment record but currently has no client workspace permissions in the central permission map. |
| Recruitment | Holds an assignment record but currently has no client workspace permissions in the central permission map. |
| Growth & Development | Holds an assignment record but currently has no client workspace permissions in the central permission map. |

The client permission map lives in
[`client/src/lib/access.ts`](client/src/lib/access.ts). The server repeats
authorization at controller and policy boundaries. Hiding a client route or
button is not considered authorization.

## Core workflows

### Account lifecycle

1. A person submits the registration form.
2. An administrator reviews the pending request.
3. Approval creates a single-use activation token, valid for 24 hours, and queues
   an activation email.
4. The user sets a password through the activation link. Opening or refreshing
   the page does not consume the token; it is consumed only after the password is
   successfully saved. If the link is unusable, the user can request a password
   reset link from the activation screen.
5. Login creates an eight-hour HTTP-only session cookie.
6. Password reset uses a separate one-time token and queued email.
7. Revoking access deactivates assignments and invalidates active sessions.

Raw account tokens are never stored. The database stores SHA-256 token hashes,
expiry, and consumption timestamps. Password-reset links expire after one hour.

### Project and semester lifecycle

Administrators create the hierarchy in this order:

1. Project
2. Center
3. Semester
4. Active semester levels
5. Staff assignments and student enrollments

New semesters can reference a source semester. The setup workspace prepares
student progression and staff assignment plans before activation. Activation is
transactional, leaves the source semester unchanged, and queues one deduplicated
transition email per affected user.

### Student management

Student creation from a semester dashboard receives project, center, and
semester context from the route. The operator selects a semester level. The
server verifies the caller's exact assignment, validates the hierarchy and
level, then creates the student and enrollment atomically.

Students can have one enrollment per semester. Historical enrollments remain
available after promotion or deactivation.

### Attendance

Student and staff attendance use separate models and endpoints. Both attach
records to their authoritative enrollment or role assignment. The server
validates dates, semester boundaries, weekend rules, statuses, holiday reasons,
and exact workspace scope before writes.

Attendance pages support responsive marking and viewing workflows. Staff and
student records can be exported as PDF. Remuneration calculations use staff
attendance and effective rates rather than accepting a manually calculated
total.

### Curriculum and assessments

Syllabi belong to one project, center, semester, and semester level. Topics can
contain subtopics and use these assessment cycles:

- `PRE_ASSESSMENT`
- `SA_1`
- `SA_2`
- `SA_3`

Topic progress moves through `PENDING`, `ONGOING`, and `COMPLETED`. Each change
records the previous state, new state, operator, notes, and timestamp.

Exams use the same assessment-cycle contract. Scores record Listening,
Speaking, Reading, and Writing components, calculated totals, absence state,
grader, and enrollment linkage.

### Library

The library is available to authenticated users and can be filtered by semester
levels. Book metadata and tables of contents live in
[`client/src/data/books.ts`](client/src/data/books.ts). PDF page offsets hide
front matter so displayed book pages align with printed page numbers.

The reader stores the last logical page per book in browser local storage and
opens there on the next visit. PDF files are loaded from configured remote
storage and are intentionally excluded from service-worker runtime caching.

### Remuneration and expenses

Payable staff use effective-dated remuneration periods. This allows rates to
change during a semester without rewriting earlier calculations. The
remuneration screen shows attendance-derived amounts and reports missing rates
or incomplete attendance instead of inventing a payment.

Administrators can create a monthly remuneration payment from ready records.
The payment and its email job are committed together. The expense ledger stores
remuneration payments and manual expenses in the same semester scope.
Remuneration expenses cannot be voided. Manual expenses can be voided with an
audited reason.

## System architecture

```mermaid
flowchart LR
    U[Browser or installed PWA]
    C[React and Vite client]
    A[Fastify API]
    P[Prisma Client]
    D[(PostgreSQL)]
    Q[Email worker]
    S[SMTP provider]
    M[Cloudinary]
    B[Remote PDF storage]

    U --> C
    C -->|Cookie session and CSRF token| A
    A --> P
    P --> D
    A -->|Creates EmailJob rows| D
    Q -->|Claims queued jobs| D
    Q --> S
    C -->|Unsigned preset upload| M
    C -->|Streams books| B
```

### Request flow

1. The client fetches `/api/v1/auth/csrf` and sends credentials with API
   requests.
2. Fastify applies CORS, cookie parsing, CSRF validation, authentication, input
   parsing, and scoped authorization.
3. Controllers call services for database work.
4. Services use the shared Prisma client.
5. React Query caches server data and invalidates affected query scopes after
   mutations.

### Background work

The API process starts the email worker after Fastify begins listening. The
worker claims due `EmailJob` rows with a lease, sends through SMTP, records
success or failure, and retries with capped delays. Graceful shutdown stops the
worker before closing Fastify.

## Technology stack

| Layer | Technology |
| --- | --- |
| Client | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4, Radix primitives, Lucide icons |
| Routing and data | React Router 7, TanStack React Query 5, Zustand |
| Interaction | Framer Motion, React Hot Toast |
| Documents | React PDF, PDF.js, jsPDF, jsPDF AutoTable |
| API | Node.js 22, Fastify 5, TypeScript |
| Database | PostgreSQL, Prisma 6 |
| Authentication | Signed JWT session cookies, CSRF token cookie and header |
| Email | Nodemailer with a PostgreSQL-backed outbox worker |
| Media | Cloudinary for uploaded images, remote blob storage for books |
| Client hosting | Vercel |
| API hosting | Azure App Service |
| CI/CD | GitHub Actions for the API, Vercel project configuration for the client |

The client package version is maintained in
[`client/package.json`](client/package.json). The API package version is
maintained separately in [`server/package.json`](server/package.json).

## Repository layout

```text
prangan-manager/
├── .github/workflows/       Azure API build and deployment workflow
├── client/                  React and Vite PWA
│   ├── public/              PWA files, icons, covers, and static images
│   ├── scripts/             Client maintenance scripts
│   └── src/
│       ├── components/      Shared UI and workspace components
│       ├── data/            Library catalog and book tables of contents
│       ├── hooks/           React Query API hooks
│       ├── lib/             Access, API, navigation, and domain helpers
│       ├── pages/           Route-level application screens
│       ├── stores/          Client state
│       ├── tests/           Vitest regression tests
│       └── types/           Client API contracts
├── docs/                    Operations guides, designs, and plans
├── server/                  Fastify API and background worker
│   ├── controllers/         HTTP request orchestration
│   ├── email/               Email payload builders
│   ├── generated/           Generated Prisma client
│   ├── prisma/              Schema, migrations, and fixtures
│   ├── routes/              API route registration
│   ├── scripts/             Backfills and operational tools
│   ├── security/            Session, CSRF, policies, and input parsing
│   ├── service/             Domain and database services
│   ├── tests/               Node test-runner suites
│   ├── types/               Server types
│   └── utils/               Shared server utilities
└── README.md                This handbook
```

There is no root `package.json`. Run npm commands from either `client/` or
`server/`.

## Local setup

### Prerequisites

- Node.js 22.x
- npm
- PostgreSQL
- Git
- A Cloudinary unsigned upload preset if image uploads are needed
- SMTP credentials if activation, password reset, transition, and payment
  emails need to be delivered locally

### 1. Clone and install

```bash
git clone git@github.com:pranganfoundation-org/prangan-manager.git
cd prangan-manager

cd server
npm ci

cd ../client
npm ci
```

`npm ci` in the server runs `prisma generate` through `postinstall`.

### 2. Configure the API

```bash
cd server
cp .env.example .env
```

Use a local configuration similar to this:

```dotenv
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgresql://LOCAL_DB_USER:LOCAL_DB_PASSWORD@localhost:5432/prangan_manager
JWT_SECRET=generate-a-long-random-value-for-local-use
CLIENT_ORIGIN=http://localhost:5173

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM_NAME=Prangan Foundation
EMAIL_FROM_ADDRESS=
```

Port `4000` is the recommended local API port because the client's development
fallback is `http://localhost:4000/api/v1`. The server code defaults to port
`3000` when `PORT` is absent.

### 3. Configure the client

```bash
cd client
cp .env.example .env
```

```dotenv
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

### 4. Prepare the database

For a new local database:

```bash
cd server
npx prisma validate
npx prisma generate
npx prisma migrate dev
```

`prisma migrate dev` applies existing migrations and creates a new migration if
the schema has uncommitted changes. Do not run it against shared or production
databases.

### 5. Start both applications

Terminal 1:

```bash
cd server
npm run dev
```

Terminal 2:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`. Check the API independently:

```bash
curl http://localhost:4000/health
```

Expected response fields include `status: "OK"`, a timestamp, and
`service: "Prangan Manager Backend"`.

## Environment variables

### Client

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Development override only | Full local API base URL including `/api/v1`. Development falls back to `http://localhost:4000/api/v1`; production uses the same-origin `/api/v1` proxy. |
| `VITE_CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name used by the browser upload helper. |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | For uploads | Unsigned Cloudinary upload preset. Restrict the preset in Cloudinary. |
| `VITE_BUILD_TIME` | No | Injected by Vite during build. Do not add it manually unless reproducing build metadata behavior. |

Only variables prefixed with `VITE_` are exposed to browser code. Never place a
Cloudinary API secret, SMTP password, database URL, or private API token in the
client environment.

### Server runtime

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string consumed by Prisma. |
| `JWT_SECRET` | Yes | Signs and verifies session tokens. Use a long random production secret. |
| `NODE_ENV` | Production: yes | Controls secure cookies, logging, and environment safeguards. |
| `PORT` | Platform dependent | Fastify listening port. Azure supplies a port; local development should use `4000`. |
| `HOST` | No | Listening host. Code default is `0.0.0.0`. |
| `CLIENT_ORIGIN` | Production outside known Azure origins: yes | Allowed credentialed browser origin. Local default is `http://localhost:5173`. |
| `EMAIL_HOST` | For email | SMTP host. Defaults to `smtp.gmail.com`. |
| `EMAIL_PORT` | For email | SMTP port. Defaults to `587`. |
| `EMAIL_SECURE` | For email | Set `true` for implicit TLS, normally port `465`; otherwise `false`. |
| `EMAIL_USER` | For email | SMTP username. |
| `EMAIL_PASS` | For email | SMTP password or provider app password. |
| `EMAIL_FROM_NAME` | No | Display name for outgoing mail. |
| `EMAIL_FROM_ADDRESS` | No | From address. Falls back to `EMAIL_USER`. |

Azure sets `WEBSITE_SITE_NAME` or `WEBSITE_HOSTNAME`. The session configuration
uses those values to detect Azure production behavior and allow the managed
Prangan client origins.

### Restricted local data tools

| Variable | Used by | Purpose |
| --- | --- | --- |
| `ALLOW_LOCAL_SEED=true` | Local fixture and syllabus scripts | Confirms that additive or fixture seed work is intentional. |
| `ALLOW_DESTRUCTIVE_SEED=true` | Fixture reset | Provides a second confirmation for destructive data replacement. |
| `DEV_SEED_PASSWORD` | Fixture reset | Password assigned only to local fixture accounts. |

### Optional maintenance scripts

| Variable | Used by | Purpose |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Server media scripts | Cloudinary account name. |
| `CLOUDINARY_API_KEY` | Server media scripts | Cloudinary server API key. |
| `CLOUDINARY_API_SECRET` | Server media scripts | Cloudinary server API secret. Never expose it to Vite. |
| `OPENROUTER_API_KEY` | Profession-image generator | Generates student future-profession images through the configured model provider. |

## Database and Prisma

### Schema

The Prisma schema is
[`server/prisma/schema.prisma`](server/prisma/schema.prisma). Major model groups
include:

| Domain | Models |
| --- | --- |
| Organization | `Projects`, `Centers`, `Semesters`, `AcademicLevel`, `SemesterLevel` |
| People and access | `User`, `UserRoleAssignments`, `AccountToken` |
| Students | `Students`, `StudentEnrollments`, `StudentAttendance` |
| Staff operations | `UserAttendance`, `SemesterRemunerationRate`, `SemesterRemunerationPeriod` |
| Semester lifecycle | `SemesterTransition` |
| Curriculum | `Syllabus`, `SyllabusTopic`, `SyllabusProgressLog` |
| Assessments | `Exam`, `StudentExamScore` |
| Finance | `Expense` |
| Background work | `EmailJob` |

### Local schema changes

```bash
cd server
npx prisma validate
npx prisma migrate dev --name describe_the_change
npx prisma generate
```

Review the generated SQL before committing it. Never edit a migration that has
already been applied to a shared environment.

### Production migrations

The Azure deployment workflow does not run migrations. An operator must apply
them separately:

```bash
cd server
npx prisma migrate status
npx prisma migrate deploy
```

Before applying:

1. Confirm the database backup or point-in-time restore position.
2. Test the restore procedure.
3. Review pending migration SQL and its mitigation plan.
4. Apply from an approved environment using the intended production
   `DATABASE_URL`.
5. Run parity or backfill verification required by the migration.
6. Smoke test `/health` and an authenticated workflow.

The migration policy is described in
[`docs/OPERATIONS.md`](docs/OPERATIONS.md).

### Managed semester-level hard cutover

Operational records use only `semesterLevelId`. The contract migration removes
the former compatibility columns, so apply it in a maintenance window and
deploy the canonical-only server and client together:

```bash
cd server
npm run db:verify:semester-level-integrity
npx prisma migrate status
npx prisma migrate deploy
npm run db:verify:semester-level-integrity
```

The verifier must report zero missing, orphaned, cross-semester, and duplicate
canonical references before and after migration. See
[`docs/OPERATIONS_MANAGED_LEVELS.md`](docs/OPERATIONS_MANAGED_LEVELS.md).

## Development commands

### Client commands

Run from `client/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite on port `5173`. |
| `npm run build` | Type-check and build the production client. |
| `npm run lint` | Run ESLint across the client. |
| `npm run test:run` | Run all Vitest tests once. |
| `npm test` | Start Vitest using its default interactive behavior. |
| `npm run preview` | Serve the built client locally. |

### Server commands

Run from `server/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Fastify with `tsx watch`. |
| `npm run build` | Compile TypeScript and copy generated Prisma runtime files. |
| `npm start` | Run `dist/server.js`. |
| `npm test` | Run all server tests with the Node test runner through `tsx`. |
| `npm run db:reset:fixtures` | Replace local data after all destructive safety checks pass. |
| `npm run db:seed:syllabus` | Add the local syllabus fixture. |
| `npm run db:seed:2026-27-curriculum` | Prepare or apply the reviewed curriculum seed. |
| `npm run db:backfill:person-names` | Dry-run or apply structured person-name backfill. |
| `npm run db:verify:semester-level-integrity` | Verify canonical managed-level references and keys. |
| `npm run db:verify:remuneration-periods` | Check effective remuneration periods. |
| `npm run generate-profession-images:trial` | Run a limited future-profession image generation trial. |
| `npm run generate-profession-images:full` | Run the full profession-image generation process. |
| `npm run check-profession-images` | Report profession-image status. |

## Testing and verification

### Full application verification

Server:

```bash
cd server
npm test
npm run build
npx prisma validate
```

Client:

```bash
cd client
npm run test:run
npm run lint
npm run build
```

Repository hygiene:

```bash
git diff --check
git status --short
```

Tests are grouped by domain. Server security tests verify controller boundaries,
input parsing, exact hierarchy authorization, database mutation ordering, and
public error behavior. Client tests cover access rules, route contracts,
responsive workspaces, navigation, forms, PWA behavior, and source-level
regressions.

For a focused test:

```bash
cd server
npx tsx --test tests/security/student-hierarchy-controller.test.ts
```

```bash
cd client
npm run test:run -- src/tests/pages/students-workspace.test.ts
```

## Fixtures, seeds, and data tools

### Destructive local fixture reset

The fixture reset deletes and replaces data. It refuses to run without all
local safety controls:

```bash
cd server
NODE_ENV=development \
ALLOW_LOCAL_SEED=true \
ALLOW_DESTRUCTIVE_SEED=true \
DEV_SEED_PASSWORD='choose-a-local-password' \
npm run db:reset:fixtures
```

Never set these flags in shared, staging, CI, or production environments.

### Additive local syllabus fixture

```bash
cd server
NODE_ENV=development ALLOW_LOCAL_SEED=true npm run db:seed:syllabus
```

### Reviewed curriculum seed

The 2026-27 curriculum script is a dry run unless apply mode is explicit:

```bash
cd server
npm run db:seed:2026-27-curriculum
```

Review its report before any apply run. The script will not enable a level that
the target semester has disabled.

### Structured person-name backfill

Dry run:

```bash
cd server
npm run db:backfill:person-names
```

Apply only after reviewing aggregate counts:

```bash
npm run db:backfill:person-names -- \
  --apply \
  --report=/absolute/protected/person-name-backfill.jsonl
```

The tool refuses unsafe report paths and existing report files. Full sequencing
is documented in [`docs/OPERATIONS.md`](docs/OPERATIONS.md).

## Authentication and security

### Sessions

- The API stores authentication in the `prangan_session` HTTP-only cookie.
- Sessions expire after eight hours.
- Production cookies are secure and use `SameSite=None` for the separate Vercel
  and Azure origins.
- Development cookies use `SameSite=Lax`.
- Session tokens include the user's session version. Revocation increments the
  version and invalidates older tokens.

### CSRF

The client first requests `/api/v1/auth/csrf`. The API stores
`prangan_csrf` in an HTTP-only cookie and returns the same token to the client.
State-changing requests send it in `X-CSRF-Token`. The server compares the
cookie and header using a timing-safe check.

### CORS

The API allows credentialed requests only from configured client origins.
Allowed methods are `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`.
Allowed request headers are `Content-Type` and `X-CSRF-Token`.

If production is not running in the recognized Azure environment,
`CLIENT_ORIGIN` is required. Do not use `*` with credentialed requests.

### Authorization

Client route guards improve navigation, but server checks are authoritative.
Controllers resolve persisted project, center, semester, level, enrollment,
exam, syllabus, attendance, or assignment scope before calling mutation
services. Administrators bypass assignment checks, not input validation.

### Sensitive data rules

- Never log passwords, raw account tokens, session tokens, bank details,
  database URLs, or SMTP credentials.
- Never put server secrets in a `VITE_` variable.
- Store migration and backfill reports outside the repository with restricted
  permissions.
- Use approved production connections for migrations and verification.
- Keep fixture safety flags out of shared environments.

## API organization

The API health endpoint is `/health`. Application endpoints use `/api/v1`.

| Prefix | Domain |
| --- | --- |
| `/api/v1/users` | Registration, login, sessions, activation, password reset, profiles, administrators, assignments, students, and enrollments |
| `/api/v1/projects` | Project lifecycle and scoped project reads |
| `/api/v1/centers` | Center lifecycle and scoped center reads |
| `/api/v1/semesters` | Semester lifecycle, details, transitions, rates, and active levels |
| `/api/v1/academic-levels` | Managed academic-level catalog |
| `/api/v1/attendance` | Staff attendance and remuneration reads |
| `/api/v1/student-attendance` | Student attendance |
| `/api/v1/syllabus` | Syllabi, topics, progress, and statistics |
| `/api/v1/exams` | Exams, scores, bulk score entry, and statistics |
| `/api/v1/expenses` | Semester expense ledger and remuneration payments |

Route registration in [`server/server.ts`](server/server.ts) and files under
[`server/routes/`](server/routes/) are authoritative. The longer endpoint
reference is [`server/API_DOCS.md`](server/API_DOCS.md), but authentication and
authorization behavior should always be checked against current route,
security, and controller code.

### Error behavior

Expected validation and authorization failures use stable public messages and
appropriate 4xx statuses. Unexpected database or service errors return a
generic 500 response. Internal identifiers and raw database errors should not
be exposed to the client.

## Frontend behavior

### Routing and data

[`client/src/App.tsx`](client/src/App.tsx) defines public, protected, admin, and
permission-scoped routes. Route-level pages are lazy loaded. TanStack React
Query owns server state, while the auth store keeps the current client session
state.

### Responsive navigation

The application uses desktop navigation, mobile navigation, workspace trees,
breadcrumbs, and contextual back actions. Semester dashboards derive visible
actions from the current user's exact assignment and permissions.

### PWA and cache behavior

The service worker is registered only outside Vite development mode. Vercel
serves `sw.js` and `index.html` with no-cache headers so deployments can recover
from stale application shells. Hashed assets use long immutable caching.

The application can prompt for installation and can clear stale caches during
update recovery. PDF responses are not stored in the runtime cache.

### Images

The browser uploads images directly through the configured Cloudinary unsigned
preset. The server-side Cloudinary credentials are reserved for maintenance
scripts and must never be shipped to the client.

### Library data

Book covers, PDF URLs, printed-page offsets, levels, sections, topics, and table
of contents entries are code-managed in
[`client/src/data/books.ts`](client/src/data/books.ts). Update its related tests
when changing a book's page alignment or structure.

## Deployment

### Client on Vercel

[`client/vercel.json`](client/vercel.json) configures:

- `npm run build`
- `dist` as the output directory
- a same-origin `/api/v1/*` proxy to the Azure API
- SPA rewrites to `index.html`
- no-cache behavior for the service worker and HTML shell
- immutable caching for hashed assets

Required production variables:

```text
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
```

Production browser requests use `https://manager.pranganfoundation.org/api/v1`.
The API rewrite must remain before the SPA fallback in `client/vercel.json` so
session and CSRF cookies remain first-party and API requests never receive
`index.html`.

### API on Azure App Service

Pushes to `main` trigger
[`/.github/workflows/main_prangan-manager-api.yml`](.github/workflows/main_prangan-manager-api.yml).
The workflow:

1. installs Node.js 22;
2. runs `npm ci` in `server/`;
3. builds the API;
4. removes development dependencies;
5. packages `dist`, `node_modules`, `package.json`, and `web.config`;
6. deploys to the `prangan-manager-api` Azure Web App.

Azure startup must run:

```bash
node dist/server.js
```

Configure runtime secrets in Azure App Service settings, not GitHub-tracked
files. At minimum, production needs:

```text
DATABASE_URL
JWT_SECRET
NODE_ENV=production
EMAIL_HOST
EMAIL_PORT
EMAIL_SECURE
EMAIL_USER
EMAIL_PASS
EMAIL_FROM_NAME
EMAIL_FROM_ADDRESS
```

Set `CLIENT_ORIGIN` when adding an approved client origin that is not already
recognized by the Azure session configuration.

### Database release responsibility

Application deployment and database migration are deliberately separate.
GitHub Actions does not run `prisma migrate deploy`. The release operator owns
backup confirmation, migration status, migration application, verification,
and post-deploy smoke tests.

## Release checklist

### Before deployment

- [ ] Review the complete diff and migration SQL.
- [ ] Run all server tests and the server build.
- [ ] Run all client tests, lint, and the client build.
- [ ] Run `npx prisma validate`.
- [ ] Confirm database backup or point-in-time recovery.
- [ ] Confirm production environment variables and client origin.
- [ ] Review managed-level, person-name, remuneration, or curriculum reports
      required by the release.
- [ ] Confirm no fixture flags or local passwords are present in shared
      environments.

### Database and application release

- [ ] Run `npx prisma migrate status` against the intended database.
- [ ] Apply reviewed migrations as an explicit operator action.
- [ ] Run required parity and backfill verification.
- [ ] Push the approved application commit to `main`.
- [ ] Confirm the Azure workflow and Vercel deployment complete.

### After deployment

- [ ] Check the API `/health` endpoint.
- [ ] Log in from the production client.
- [ ] Verify CSRF-protected mutation from the intended origin.
- [ ] Open one project, center, and semester dashboard.
- [ ] Smoke test the primary workflow changed by the release.
- [ ] Review Azure logs for startup, Prisma, CORS, and email-worker failures.
- [ ] Check queued email jobs if the release affects notifications.
- [ ] Confirm the PWA loads the new application version after refresh.

## Troubleshooting

### Client cannot reach the API

Check:

1. In production, `/api/v1/auth/csrf` on the frontend domain returns JSON
   through the Vercel rewrite rather than `index.html`.
2. The `/api/v1/:path*` rewrite appears before the SPA fallback.
3. In development, the server is listening on the port used by
   `VITE_API_BASE_URL`.
4. `CLIENT_ORIGIN` exactly matches the browser origin.
5. Requests send credentials.
6. The server restarted after environment changes.

For local work, the least surprising pair is:

```text
Client: http://localhost:5173
API:    http://localhost:4000/api/v1
```

### `P2021: The table ... does not exist`

The database schema is behind the application. Check the target connection,
then apply pending migrations:

```bash
cd server
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
```

Use `migrate dev` instead of `migrate deploy` only for a disposable local
development database where schema changes are being authored.

### `P1017: Server has closed the connection`

This normally points to a database connection interruption rather than the
specific Prisma query shown in the stack trace.

1. Confirm the database is online and reachable.
2. Check `DATABASE_URL`, SSL requirements, connection limits, and provider
   logs.
3. Stop duplicate local API processes and background workers.
4. Restart the API after connectivity is stable.
5. Re-run the failed request before changing query code.

### Prisma client and schema disagree

```bash
cd server
npx prisma validate
npx prisma generate
npm run build
```

Restart the API after generation. The repository imports the shared generated
client from `server/generated/prisma`.

### Login works but mutations fail with CSRF errors

Confirm that:

- the client fetched `/api/v1/auth/csrf`;
- cookies are accepted by the browser;
- the request includes `X-CSRF-Token`;
- the client and API use HTTPS in production;
- `CLIENT_ORIGIN` and cookie settings match the deployed client.

Clearing site cookies and logging in again is appropriate after a session or
CSRF configuration change.

### A user sees a 403 in a valid-looking workspace

Inspect the active role assignment:

- primary role and sub-role;
- `isActive`;
- `projectId`;
- `centerId`;
- `semesterId`;
- `semesterLevelId` for educator level-sensitive actions.

The screen's route context and the persisted assignment must match exactly.
Center Manager student creation also requires the selected level to be active
in that semester.

### Email jobs keep failing

Check SMTP variables, provider authentication, allowed sender address, and
Azure outbound connectivity. Then inspect `EmailJob` status, attempts,
`availableAt`, lease fields, and `lastError`. Do not manually mark a job sent
without confirming delivery.

The worker reclaims stale processing leases and abandons jobs after the
configured final attempt.

### Library PDF or page numbers are wrong

Check:

1. the remote `pdfUrl` is reachable;
2. PDF.js worker, CMap, and standard-font requests are not blocked;
3. the book's `pdfOffset` matches its front matter;
4. the table of contents uses logical book pages, not raw PDF pages;
5. local last-read progress is not pointing past the new page count.

Book metadata is in [`client/src/data/books.ts`](client/src/data/books.ts).
Last-read behavior is in
[`client/src/lib/book-progress.ts`](client/src/lib/book-progress.ts).

### Installed PWA shows an old release

Use the in-app update or recovery prompt first. If it cannot recover:

1. close all installed and browser tabs for the app;
2. clear the site's service worker and Cache Storage;
3. reload the production URL;
4. confirm `sw.js` and `index.html` return no-cache headers;
5. verify Vercel is serving the expected deployment.

The application deliberately does not runtime-cache PDF files.

### Image upload fails

Confirm the client cloud name and unsigned upload preset. Check preset folder,
format, file-size, and origin restrictions in Cloudinary. Never solve a browser
upload failure by adding `CLOUDINARY_API_SECRET` to the client.

## Internal documentation

| Document | Purpose |
| --- | --- |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Fixtures, migration discipline, Azure release checks, and structured name rollout. |
| [`docs/OPERATIONS_MANAGED_LEVELS.md`](docs/OPERATIONS_MANAGED_LEVELS.md) | Managed semester-level backfill and parity verification. |
| [`server/API_DOCS.md`](server/API_DOCS.md) | Extended API endpoint reference. |
| [`docs/REMEDIATION_ROADMAP.md`](docs/REMEDIATION_ROADMAP.md) | Historical and planned remediation work. |
| [`docs/superpowers/specs/`](docs/superpowers/specs/) | Approved feature and behavior designs. |
| [`docs/superpowers/plans/`](docs/superpowers/plans/) | Implementation plans and verification steps. |

Source code remains authoritative when a document and implementation disagree.
Update the relevant document in the same change that alters a command,
environment variable, role, route, migration procedure, or deployment path.

## Maintaining this handbook

Before handing off a documentation change:

1. Check every command against the current `package.json`.
2. Check every environment variable against code and `.env.example`.
3. Check role descriptions against the client access map and server policies.
4. Check deployment claims against Vercel configuration and GitHub Actions.
5. Test every relative link.
6. Run `git diff --check`.
7. Keep secrets and protected report paths out of Git.

Use concise commit messages that describe the behavior or operational contract
being changed. Pair code changes with their tests, migrations, and handbook
updates when those artifacts must stay in sync.
