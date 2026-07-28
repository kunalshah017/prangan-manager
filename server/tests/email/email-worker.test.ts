import assert from "node:assert/strict";
import test from "node:test";
import {
  runEmailWorkerOnce,
  startEmailWorker,
  type EmailWorkerDependencies,
} from "../../service/email-worker.js";

const job = {
  id: "job-1",
  to: "aditi@example.org",
  subject: "Welcome",
  html: "<p>Welcome</p>",
  text: "Welcome",
  messageId: "<email-job-job-1@manager.pranganfoundation.org>",
  lockToken: "lease-1",
  attempts: 1,
  maxAttempts: 5,
};

test("one worker cycle delivers and completes the claimed lease once", async () => {
  const events: string[] = [];
  const worked = await runEmailWorkerOnce({
    claimNext: async () => job,
    deliver: async (claimed) => {
      events.push(`send:${claimed.messageId}`);
    },
    complete: async (claimed) => {
      events.push(`complete:${claimed.id}:${claimed.lockToken}`);
    },
    fail: async () => {
      events.push("unexpected-failure");
    },
  });

  assert.equal(worked, true);
  assert.deepEqual(events, [
    "send:<email-job-job-1@manager.pranganfoundation.org>",
    "complete:job-1:lease-1",
  ]);
});

test("one worker cycle records delivery failure without completing the job", async () => {
  const events: string[] = [];
  const worked = await runEmailWorkerOnce({
    claimNext: async () => job,
    deliver: async () => {
      throw new Error("SMTP temporarily unavailable");
    },
    complete: async () => {
      events.push("unexpected-completion");
    },
    fail: async (claimed, error) => {
      events.push(`fail:${claimed.id}:${error.message}`);
    },
  });

  assert.equal(worked, true);
  assert.deepEqual(events, [
    "fail:job-1:SMTP temporarily unavailable",
  ]);
});

test("an empty worker cycle performs no delivery work", async () => {
  let delivered = false;
  const worked = await runEmailWorkerOnce({
    claimNext: async () => null,
    deliver: async () => {
      delivered = true;
    },
    complete: async () => undefined,
    fail: async () => undefined,
  });

  assert.equal(worked, false);
  assert.equal(delivered, false);
});

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
    pollIntervalMs: 5,
    dependencies: workerDependencies({
      claimNext: async () => {
        claims += 1;
        return null;
      },
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

test("startup drains every ready job before sleeping", async () => {
  const readyJobs = [
    job,
    { ...job, id: "job-2", lockToken: "lease-2" },
  ];
  const delivered: string[] = [];
  const worker = startEmailWorker({
    dependencies: workerDependencies({
      claimNext: async () => readyJobs.shift() ?? null,
      deliver: async (claimed) => {
        delivered.push(claimed.id);
      },
    }),
  });

  await waitUntil(() => delivered.length === 2);
  assert.deepEqual(delivered, ["job-1", "job-2"]);
  await worker.stop();
});

test("stop cancels a scheduled future queue wake", async () => {
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
        return new Date(Date.now() + 15);
      },
    }),
  });

  await waitUntil(() => wakeLookups === 1);
  await worker.stop();
  await delay(25);
  assert.equal(claims, 1);
});
