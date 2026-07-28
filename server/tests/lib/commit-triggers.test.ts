import assert from "node:assert/strict";
import test from "node:test";
import {
  emitCommitTrigger,
  onCommitTrigger,
} from "../../lib/commit-triggers.js";

test("a commit trigger notifies every registered listener", () => {
  const events: string[] = [];
  const removeWorker = onCommitTrigger("email-job-committed", () => {
    events.push("worker");
  });
  const removeMetrics = onCommitTrigger("email-job-committed", () => {
    events.push("metrics");
  });

  emitCommitTrigger("email-job-committed");

  assert.deepEqual(events, ["worker", "metrics"]);
  removeWorker();
  removeMetrics();
});

test("the returned unsubscribe removes only its listener", () => {
  const events: string[] = [];
  const removeFirst = onCommitTrigger("email-job-committed", () => {
    events.push("removed");
  });
  const removeSecond = onCommitTrigger("email-job-committed", () => {
    events.push("kept");
  });

  removeFirst();
  emitCommitTrigger("email-job-committed");

  assert.deepEqual(events, ["kept"]);
  removeSecond();
});

test("one failing listener does not block other post-commit listeners", () => {
  const events: string[] = [];
  const removeFailing = onCommitTrigger("email-job-committed", () => {
    throw new Error("trigger failed");
  });
  const removeWorking = onCommitTrigger("email-job-committed", () => {
    events.push("continued");
  });

  const errors = emitCommitTrigger("email-job-committed");

  assert.deepEqual(events, ["continued"]);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, "trigger failed");
  removeFailing();
  removeWorking();
});
