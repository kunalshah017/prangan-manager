import assert from "node:assert/strict";
import test from "node:test";
import { runEmailWorkerOnce } from "../../service/email-worker.js";

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
