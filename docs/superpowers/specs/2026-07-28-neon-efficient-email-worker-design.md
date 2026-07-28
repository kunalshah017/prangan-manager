# Neon-Efficient Email Worker Design

## Problem

The API starts an email worker that polls the `EmailJob` table every five
seconds, including when the queue is empty. Neon suspends the Free Plan compute
after five minutes without database activity, so this polling prevents scale to
zero and consumes the project's 100 monthly CU-hour allowance.

The fix must retain the durable database-backed email outbox, deduplication,
delivery retries, and restart recovery while eliminating database queries when
there is no email work.

## Design

Replace periodic idle polling with an event-driven worker:

1. Run one recovery cycle when the API starts.
2. Wake the worker after an email job has been committed.
3. Drain all currently available jobs.
4. If a delivery failure schedules a retry, set an in-process timer for the
   retry time.
5. When no available or future jobs remain, stop scheduling work and make no
   database queries until the next enqueue notification.

The worker will retain a single-process guard so multiple enqueue notifications
cannot start overlapping drain cycles.

## Commit Boundary

Email jobs are commonly created inside Prisma transactions. A wake notification
must happen only after the enclosing transaction succeeds; otherwise, the
worker could check before the job becomes visible and then return to sleep.

Each transactional workflow will therefore notify the worker immediately after
its transaction resolves:

- registration approval
- registration rejection
- password reset
- semester activation
- remuneration payment

The outbox insert remains part of the business transaction, preserving atomicity
between the business change and its email job.

## Retry and Recovery

Existing retry delays, attempt limits, leases, deduplication keys, and terminal
failure behavior remain unchanged.

After processing a job, the worker queries for the next claimable job. If no job
is currently claimable but a pending retry exists, it schedules one timer for
that job's `availableAt` time. A server restart performs one initial recovery
check, which discovers committed jobs or scheduled retries left by the previous
process.

If the database is temporarily unavailable, the worker logs the failure and
uses a bounded retry timer. This timer runs only after a real worker/database
failure; it does not restore continuous empty-queue polling.

## Testing

Tests will verify that:

- startup performs a recovery cycle;
- an empty queue leaves no recurring poll timer;
- notifying a sleeping worker starts a drain cycle;
- repeated notifications do not create overlapping workers;
- available jobs are drained without delay;
- a future retry schedules one wake-up at its availability time;
- stopping the API cancels pending timers and waits for active work;
- all existing email delivery, lease, retry, and wiring tests continue to pass.

## Operational Result

Normal API requests will still wake Neon as expected. When the application and
email queue are inactive, the server will issue no background database queries,
allowing Neon's fixed five-minute Free Plan autosuspend to scale the compute to
zero.

No new service, dependency, queue provider, or paid Neon feature is required.
