# Neon-Efficient Email Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace five-second email queue polling with reusable post-commit triggers and an event-driven worker that allows Neon to scale to zero.

**Architecture:** A dependency-free commit-trigger registry publishes an `email-job-committed` event only after business transactions succeed. The email worker performs one startup recovery check, wakes for commit events, drains ready jobs, schedules the earliest real retry or lease recovery, and otherwise owns no timer.

**Tech Stack:** TypeScript, Node.js timers and `node:test`, Prisma 6, PostgreSQL/Neon, Fastify

---

## File Structure

- Create `server/lib/commit-triggers.ts`: reusable trigger registration,
  unregistration, and emission.
- Create `server/tests/lib/commit-triggers.test.ts`: registry behavior.
- Modify `server/service/email-queue.service.ts`: expose the earliest meaningful
  queue wake time.
- Modify `server/service/email-worker.ts`: replace periodic polling with
  startup, explicit wake, drain, and exact retry scheduling.
- Modify `server/tests/email/email-worker.test.ts`: event-driven lifecycle tests.
- Modify `server/server.ts`: register and unregister the email commit listener.
- Modify email-producing workflows in `server/controllers/user.controller.ts`,
  `server/service/expense.service.ts`, and
  `server/service/semester-transition.service.ts`: emit only after successful
  commits.
- Modify `server/tests/security/email-worker-wiring.test.ts`: verify trigger
  wiring and absence of the five-second polling default.

### Task 1: Reusable Commit-Trigger Registry

**Files:**
- Create: `server/lib/commit-triggers.ts`
- Create: `server/tests/lib/commit-triggers.test.ts`

- [ ] **Step 1: Write the failing registry tests**

```ts
test("a commit trigger notifies every registered listener", () => {
  const events: string[] = [];
  onCommitTrigger("email-job-committed", () => events.push("worker"));
  onCommitTrigger("email-job-committed", () => events.push("metrics"));
  emitCommitTrigger("email-job-committed");
  assert.deepEqual(events, ["worker", "metrics"]);
});

test("the returned unsubscribe removes only its listener", () => {
  const events: string[] = [];
  const unsubscribe = onCommitTrigger("email-job-committed", () =>
    events.push("removed"),
  );
  onCommitTrigger("email-job-committed", () => events.push("kept"));
  unsubscribe();
  emitCommitTrigger("email-job-committed");
  assert.deepEqual(events, ["kept"]);
});
```

- [ ] **Step 2: Verify the tests fail for the missing module**

Run: `cd server && npx tsx --test tests/lib/commit-triggers.test.ts`

Expected: FAIL because `lib/commit-triggers.ts` does not exist.

- [ ] **Step 3: Implement the minimal registry**

```ts
export const EMAIL_JOB_COMMITTED = "email-job-committed";

type CommitTriggerListener = () => void;
const listeners = new Map<string, Set<CommitTriggerListener>>();

export const onCommitTrigger = (
  trigger: string,
  listener: CommitTriggerListener,
) => {
  const triggerListeners = listeners.get(trigger) ?? new Set();
  triggerListeners.add(listener);
  listeners.set(trigger, triggerListeners);
  return () => {
    triggerListeners.delete(listener);
    if (triggerListeners.size === 0) listeners.delete(trigger);
  };
};

export const emitCommitTrigger = (trigger: string) => {
  for (const listener of listeners.get(trigger) ?? []) listener();
};
```

- [ ] **Step 4: Run the registry tests**

Run: `cd server && npx tsx --test tests/lib/commit-triggers.test.ts`

Expected: 2 tests pass.

- [ ] **Step 5: Commit the registry**

```bash
git add server/lib/commit-triggers.ts server/tests/lib/commit-triggers.test.ts
git commit -m "feat: add reusable commit trigger registry"
```

### Task 2: Discover the Next Real Email Wake Time

**Files:**
- Modify: `server/service/email-queue.service.ts`
- Modify: `server/tests/email/email-worker.test.ts`

- [ ] **Step 1: Add a failing worker dependency test**

```ts
test("a future queue wake does not claim before its availability time", async () => {
  let claims = 0;
  const availableAt = new Date(Date.now() + 30);
  const worker = startEmailWorker({
    dependencies: workerDependencies({
      claimNext: async () => {
        claims += 1;
        return null;
      },
      nextWakeAt: async () => availableAt,
    }),
  });

  await waitUntil(() => claims === 1);
  await delay(10);
  assert.equal(claims, 1);
  await worker.stop();
});
```

This establishes that an empty immediate queue can still recover a scheduled
retry without periodic polling.

- [ ] **Step 2: Run the email worker test and verify the type/behavior failure**

Run: `cd server && npx tsx --test tests/email/email-worker.test.ts`

Expected: FAIL because the worker has no `nextWakeAt` dependency.

- [ ] **Step 3: Add `getNextEmailJobWakeAt`**

Query only eligible `PENDING` and leased `PROCESSING` jobs. Map pending jobs to
`availableAt`; map processing jobs to `lockedAt + EMAIL_JOB_LEASE_MS`; return
the earliest date or `null`.

```ts
export const getNextEmailJobWakeAt = async (): Promise<Date | null> => {
  const jobs = await prisma.emailJob.findMany({
    where: {
      OR: [
        {
          status: EmailJobStatus.PENDING,
          attempts: { lt: EMAIL_JOB_MAX_ATTEMPTS },
        },
        {
          status: EmailJobStatus.PROCESSING,
          lockedAt: { not: null },
        },
      ],
    },
    select: { status: true, availableAt: true, lockedAt: true },
  });
  const wakeTimes = jobs.flatMap((job) =>
    job.status === EmailJobStatus.PENDING
      ? [job.availableAt]
      : job.lockedAt
        ? [new Date(job.lockedAt.getTime() + EMAIL_JOB_LEASE_MS)]
        : [],
  );
  return wakeTimes.length
    ? new Date(Math.min(...wakeTimes.map((date) => date.getTime())))
    : null;
};
```

- [ ] **Step 4: Run the targeted tests**

Run: `cd server && npx tsx --test tests/email/email-worker.test.ts`

Expected: the new wake-time test proceeds to the worker lifecycle failure
addressed in Task 3; existing one-cycle tests remain green.

### Task 3: Event-Driven Email Worker

**Files:**
- Modify: `server/service/email-worker.ts`
- Modify: `server/tests/email/email-worker.test.ts`

- [ ] **Step 1: Add failing lifecycle tests**

Add these helpers and observable behavior tests using short real timers:

```ts
const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitUntil = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (condition()) return;
    await delay(2);
  }
  assert.fail("Timed out waiting for worker state");
};

const workerDependencies = (
  overrides: Partial<EmailWorkerDependencies> = {},
): EmailWorkerDependencies => ({
  claimNext: async () => null,
  nextWakeAt: async () => null,
  deliver: async () => undefined,
  complete: async () => undefined,
  fail: async () => undefined,
  ...overrides,
});

test("an empty startup cycle does not poll again", async () => {
  let claims = 0;
  const worker = startEmailWorker({
    dependencies: workerDependencies({
      claimNext: async () => {
        claims += 1;
        return null;
      },
      nextWakeAt: async () => null,
    }),
  });
  await waitUntil(() => claims === 1);
  await delay(25);
  assert.equal(claims, 1);
  await worker.stop();
});

test("wake drains work without overlapping cycles", async () => {
  let claims = 0;
  let activeClaims = 0;
  let maxActiveClaims = 0;
  let releaseClaim!: () => void;
  const claimGate = new Promise<void>((resolve) => {
    releaseClaim = resolve;
  });
  const worker = startEmailWorker({
    dependencies: workerDependencies({
      claimNext: async () => {
        claims += 1;
        activeClaims += 1;
        maxActiveClaims = Math.max(maxActiveClaims, activeClaims);
        if (claims === 1) await claimGate;
        activeClaims -= 1;
        return null;
      },
    }),
  });

  await waitUntil(() => activeClaims === 1);
  worker.wake();
  worker.wake();
  releaseClaim();
  await waitUntil(() => claims === 2);
  await delay(20);
  assert.equal(maxActiveClaims, 1);
  assert.equal(claims, 2);
  await worker.stop();
});

test("a future queue wake runs once at its availability time", async () => {
  let claims = 0;
  let wakeLookups = 0;
  const worker = startEmailWorker({
    dependencies: workerDependencies({
      claimNext: async () => {
        claims += 1;
        return null;
      },
      nextWakeAt: async () => {
        wakeLookups += 1;
        return wakeLookups === 1 ? new Date(Date.now() + 15) : null;
      },
    }),
  });

  await waitUntil(() => claims === 2);
  await delay(20);
  assert.equal(claims, 2);
  await worker.stop();
});
```

- [ ] **Step 2: Verify the lifecycle tests fail**

Run: `cd server && npx tsx --test tests/email/email-worker.test.ts`

Expected: FAIL because the current worker polls after five seconds, has no
`wake()`, and does not use `nextWakeAt`.

- [ ] **Step 3: Implement startup recovery, wake, drain, and scheduling**

Change `startEmailWorker` so:

- `schedule(0)` performs the one startup recovery cycle.
- `wake()` clears a future timer and requests an immediate cycle.
- one `running` promise prevents overlap.
- each cycle calls `runEmailWorkerOnce` until it returns `false`.
- an empty queue calls `nextWakeAt()` once and schedules only that time.
- database/worker errors schedule a bounded 60-second recovery attempt.
- `stop()` clears timers and awaits active work.

Remove the `pollIntervalMs = 5_000` option entirely.

- [ ] **Step 4: Run the worker tests**

Run: `cd server && npx tsx --test tests/email/email-worker.test.ts`

Expected: all one-cycle and lifecycle tests pass.

- [ ] **Step 5: Commit queue scheduling and worker changes**

```bash
git add server/service/email-queue.service.ts server/service/email-worker.ts server/tests/email/email-worker.test.ts
git commit -m "fix: stop polling idle email queue"
```

### Task 4: Wire Commit Triggers After Successful Transactions

**Files:**
- Modify: `server/server.ts`
- Modify: `server/controllers/user.controller.ts`
- Modify: `server/service/expense.service.ts`
- Modify: `server/service/semester-transition.service.ts`
- Modify: `server/tests/security/email-worker-wiring.test.ts`

- [ ] **Step 1: Add failing source-wiring assertions**

Assert that:

- `server.ts` registers `EMAIL_JOB_COMMITTED` to `emailWorker.wake`.
- shutdown unregisters the listener.
- each email-producing workflow emits `EMAIL_JOB_COMMITTED` after its
  transaction.
- `email-worker.ts` does not contain `pollIntervalMs = 5_000`.

- [ ] **Step 2: Verify the wiring test fails**

Run: `cd server && npx tsx --test tests/security/email-worker-wiring.test.ts`

Expected: FAIL because commit triggers are not wired.

- [ ] **Step 3: Register the worker listener in `server.ts`**

After starting the worker, register:

```ts
removeEmailCommitTrigger = onCommitTrigger(
  EMAIL_JOB_COMMITTED,
  () => emailWorker?.wake(),
);
```

On both shutdown signals, call the returned unsubscribe function before
stopping the worker.

- [ ] **Step 4: Emit only after successful commits**

Use:

```ts
emitCommitTrigger(EMAIL_JOB_COMMITTED);
```

after successful registration rejection, registration approval, password reset,
semester activation with `queuedEmailCount > 0`, and remuneration processing
when at least one result has status `PAID`.

Do not emit inside Prisma transaction callbacks.

- [ ] **Step 5: Run focused workflow and wiring tests**

Run:

```bash
cd server
npx tsx --test \
  tests/security/email-worker-wiring.test.ts \
  tests/security/auth-lifecycle-wiring.test.ts \
  tests/security/semester-transition-wiring.test.ts \
  tests/security/expense-service.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit the integration**

```bash
git add server/server.ts server/controllers/user.controller.ts server/service/expense.service.ts server/service/semester-transition.service.ts server/tests/security/email-worker-wiring.test.ts
git commit -m "feat: wake email worker after committed jobs"
```

### Task 5: Full Verification

**Files:**
- Verify all modified files

- [ ] **Step 1: Run formatting and type checks through the production build**

Run: `cd server && npm run build`

Expected: TypeScript compilation and Prisma copy complete successfully.

- [ ] **Step 2: Run the complete server test suite**

Run: `cd server && npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
git log --oneline -5
```

Expected: no whitespace errors; only intentional plan/spec changes remain if
they were not included in earlier commits.

- [ ] **Step 4: Commit updated design and plan documents**

```bash
git add docs/superpowers/specs/2026-07-28-neon-efficient-email-worker-design.md docs/superpowers/plans/2026-07-28-neon-efficient-email-worker.md
git commit -m "docs: document extensible email commit triggers"
```
