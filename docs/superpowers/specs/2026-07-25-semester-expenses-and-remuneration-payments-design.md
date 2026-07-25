# Semester Expenses and Remuneration Payments

## Purpose

Create an administrator-only semester expense ledger and turn the existing
remuneration page into a safe monthly payment workflow.

The implementation must:

- keep remuneration configuration exclusively in Semester Users;
- calculate remuneration from authoritative attendance and effective-dated
  remuneration periods;
- record remuneration as an expense only after an administrator marks it paid;
- enqueue one payment email for each newly paid person;
- prevent duplicate expenses and emails;
- support manually entered expenses now;
- retain enough scope and audit data for future reimbursement workflows.

## Scope

This version includes:

- a flexible expense database model;
- scoped expense list, create, and void APIs;
- monthly individual and bulk remuneration payment;
- transactional email outbox integration;
- a responsive administrator Expenses page;
- read-only remuneration values on the payment page;
- payment state and bulk payment controls.

This version does not include:

- receipt uploads;
- reimbursement requests or approvals;
- budgets, income, transfers, or accounting journal entries;
- payment gateway or bank integration;
- editing or deleting system-generated remuneration expenses;
- hard deletion of manual expenses.

## Access Control

Only users with the global `ADMIN` role may:

- open the Expenses page;
- list expenses;
- create manual expenses;
- void manual expenses;
- mark remuneration paid.

Every server operation must independently verify that:

1. the project exists;
2. the center belongs to the project;
3. the semester belongs to the center;
4. the requested date or month falls within the semester.

Client-side route protection is supplementary and must not replace server
authorization.

## Data Model

Use one `Expense` table with required project, center, and semester foreign
keys. This creates a distinct logical ledger for every semester while allowing
future project-, center-, and application-level reporting without creating
physical tables dynamically.

### Expense

| Field | Purpose |
| --- | --- |
| `id` | Primary identifier |
| `projectId` | Required project scope |
| `centerId` | Required center scope |
| `semesterId` | Required semester scope |
| `expenseType` | Extensible string; initially `REMUNERATION` or `MANUAL` |
| `category` | Display/reporting category |
| `title` | Human-readable ledger description |
| `amount` | INR amount as `Decimal(12,2)`, nonnegative |
| `incurredOn` | Date assigned to the expense |
| `notes` | Optional administrator notes |
| `payeeUserId` | Optional user receiving the payment |
| `sourceKey` | Optional globally unique idempotency key |
| `metadata` | Optional structured source details |
| `status` | `ACTIVE` or `VOIDED` |
| `createdBy` | Administrator who recorded or paid it |
| `voidedBy` | Administrator who voided it |
| `voidedAt` | Void timestamp |
| `voidReason` | Required reason for voiding |
| `createdAt` / `updatedAt` | Audit timestamps |

`expenseType` remains a string so adding `REIMBURSEMENT` or another future type
does not require a database enum migration. Public manual-expense input cannot
choose a system-owned type.

Required indexes:

- `(projectId, centerId, semesterId, incurredOn)`;
- `(semesterId, expenseType, status, incurredOn)`;
- `(payeeUserId, semesterId, incurredOn)`;
- unique nullable `sourceKey`.

Database constraints enforce nonnegative amounts and complete void metadata.

### Remuneration Source Key

A remuneration payment uses:

```text
remuneration:<semesterId>:<userId>:<periodStart>:<periodEnd>
```

The unique source key is the final defense against repeated clicks, retries,
and concurrent payment requests.

### Remuneration Metadata

The immutable metadata snapshot contains:

- selected month;
- clipped period start and end;
- present-day count;
- attendance record IDs;
- effective remuneration period IDs used;
- the calculated amount.

This snapshot explains a historical payment even if attendance or remuneration
configuration changes later. The server remains the source of this metadata.

## Remuneration Calculation

For each selected user:

1. Clip the selected calendar month to the semester start and end dates.
2. Confirm the person is an educator or center manager in the exact scope,
   including historical assignments that produced attendance in that month.
3. Load `PRESENT` attendance records in the period.
4. Resolve the remuneration period effective on each attendance date.
5. Reject the payment as incomplete if any present date lacks remuneration.
6. Sum the effective daily amounts for all present dates.
7. If there are no present dates or the total is zero, report `NO_PAYMENT_DUE`
   without creating an expense or sending an email.
8. Otherwise create the expense and enqueue the email atomically.

The client-provided request contains user IDs and a month, never an amount.

## Payment API

### Mark remuneration paid

`POST /api/v1/expenses/remuneration-payments`

Request:

```json
{
  "projectId": "project-id",
  "centerId": "center-id",
  "semesterId": "semester-id",
  "month": "2026-07",
  "userIds": ["user-id"]
}
```

Rules:

- accept one or multiple unique user IDs;
- validate a canonical `YYYY-MM` month;
- calculate every amount on the server;
- process each user in an independent short transaction so one invalid person
  does not block valid payments;
- create the Expense and EmailJob in the same transaction;
- return `PAID`, `ALREADY_PAID`, `INCOMPLETE`, or `NO_PAYMENT_DUE` per user;
- never enqueue an email for an existing expense.

The UI offers:

- an individual “Mark as paid” action;
- row selection;
- “Mark selected as paid”;
- “Select all ready” for the current filtered month.

## Payment Email

The email uses the existing reusable outbox and worker. It contains:

- the recipient’s name;
- center and semester;
- payment month;
- present-day count;
- paid remuneration amount;
- payment date;
- a concise appreciation message from Prangan.

The email job dedupe key derives from the remuneration expense source key.
Expense creation rolls back if the email cannot be queued. SMTP delivery remains
asynchronous and retryable.

## Expense APIs

### List expenses

`GET /api/v1/expenses`

Required scope:

- `projectId`;
- `centerId`;
- `semesterId`.

Optional filters:

- month;
- expense type;
- category;
- status;
- search.

The response includes filtered records and totals for:

- all active expenses;
- remuneration;
- manual expenses;
- voided expenses when requested.

### Create manual expense

`POST /api/v1/expenses/manual`

Required:

- exact hierarchy scope;
- title;
- category;
- amount;
- incurred date.

Optional:

- notes.

The server assigns `expenseType: "MANUAL"`, `status: ACTIVE`, and `createdBy`.
The incurred date must be within the semester.

### Void manual expense

`POST /api/v1/expenses/:expenseId/void`

Required:

- void reason.

Only active manual expenses may be voided. Remuneration expenses are immutable
in this version. Corrections use a void-and-recreate workflow so the original
record remains available for audit.

## Client Experience

### Remuneration Page

The page remains monthly and attendance-focused.

Remove:

- editable daily remuneration inputs;
- editable effective-from inputs;
- unsaved remuneration previews;
- the save-remuneration banner and mutation.

Add:

- read-only applicable daily remuneration or schedule summary;
- the effective period used for the selected month;
- “Manage remuneration settings” linking to Semester Users;
- `Ready`, `Incomplete`, `No payment due`, and `Paid` states;
- paid date and paid amount;
- individual and bulk payment actions;
- progress and partial-result feedback;
- disabled payment actions for incomplete records.

The full-semester view remains a summary and does not expose payment actions.

### Expenses Page

Route:

```text
/projects/:projectId/centers/:centerId/semesters/:semesterId/dashboard/expenses
```

The administrator-only page includes:

- total active expenses;
- remuneration total;
- manual-expense total;
- month, type, category, status, and search filters;
- desktop ledger table;
- compact mobile expense cards;
- add-manual-expense modal or sheet;
- void action with a required reason;
- source and audit labels;
- empty, loading, error, and retry states.

Manual entry fields:

- expense date;
- title;
- category;
- amount;
- optional notes.

Category is a validated free-text value with useful UI suggestions rather than
a database enum.

### Navigation

Add an administrator-only Expenses action to the semester dashboard alongside
Remuneration. Direct navigation by a non-admin must render the existing
forbidden/not-authorized experience.

## Error Handling

- Reject malformed bodies and unknown fields before database work.
- Return stable public error messages without Prisma or SMTP details.
- Report bulk payment results per user.
- Preserve successful individual payments when another selected user fails.
- Treat duplicate source keys as `ALREADY_PAID`.
- Invalidate remuneration and expense queries after any successful payment.
- Never optimistically display a payment as completed before the server
  confirms the expense.

## Testing

### Server

- schema and migration constraints;
- administrator-only route registration;
- hierarchy and semester-date validation;
- strict manual-expense input parsing;
- manual expense creation;
- manual expense voiding and immutable remuneration records;
- authoritative effective-dated remuneration calculation;
- incomplete remuneration handling;
- no-payment-due handling;
- individual and bulk payment;
- duplicate and concurrent payment idempotency;
- one Expense and one EmailJob per newly paid user/month;
- no email for duplicate, incomplete, or zero payments;
- stable public failures.

### Client

- remuneration configuration controls are absent from the payment page;
- applicable remuneration remains visible read-only;
- settings link uses the exact semester route;
- paid/incomplete/ready/no-payment states;
- individual and bulk actions;
- partial bulk results;
- Expenses route and administrator visibility;
- manual form validation;
- expense filtering, totals, void flow;
- responsive table/card rendering;
- loading, empty, and error states.

### Verification

Before completion:

- Prisma validation and generation;
- server tests and production build;
- client tests, lint, and production build;
- browser checks at desktop and mobile widths for Remuneration and Expenses;
- network verification that repeated payment clicks do not create duplicate
  expenses or email jobs.

