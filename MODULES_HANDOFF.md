# Planning, Events and Reports module handoff

## Implemented in this branch
- Planning & Calendar: semester-scoped activity creation, listing and deletion.
- Event Management & Smart Archive: semester-scoped event creation, listing and deletion, status tracking and archive notes.
- Reports & Analytics: server-generated counts for planned activities and event statuses.
- Frontend workspace: all three tabs call the backend APIs through the existing authenticated `api` client. Data is stored in PostgreSQL through Prisma; browser-local storage is not used.

## Backend API
All endpoints are registered under `/api/v1/operations` and use the existing session authentication middleware:
- `GET /planning?projectId=...&centerId=...&semesterId=...`
- `POST /planning`
- `DELETE /planning/:id?projectId=...&centerId=...&semesterId=...`
- `GET /events?...`
- `POST /events`
- `DELETE /events/:id?...`
- `GET /reports?...`

The controller verifies that the selected semester belongs to the selected center and project. Current controller authorization is ADMIN-only; confirm the intended staff roles with the maintainers before merge.

## Database
Prisma models `PlanningItem` and `ManagedEvent` and migration `20261031130000_add_planning_events` are included. Apply only to a disposable/local development database first. Do not run migrations against shared/production databases without maintainer approval.

## Known limitations / review items
- Event category and time are currently carried in the event description/date fields, rather than dedicated database columns.
- Reports currently summarize planning and event records only; they do not yet combine attendance, expenses or other existing operational datasets.
- Edit/update operations are not included; create, list and delete are supported.
- This handoff has not been verified against the NGO's live database or deployment environment. Kunal's team should run Prisma validation/generation, tests and builds, review permissions, and merge/deploy through the normal process.
