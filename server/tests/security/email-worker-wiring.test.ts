import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverFile = (path: string) =>
  new URL(`../../${path}`, import.meta.url);

test("the reusable email queue uses deduplication and lease-scoped updates", async () => {
  const service = await readFile(
    serverFile("service/email-queue.service.ts"),
    "utf8",
  );

  assert.match(service, /emailJob\.upsert/);
  assert.match(service, /where:\s*\{\s*dedupeKey/);
  assert.match(service, /emailJob\.updateMany/);
  assert.match(service, /lockToken/);
  assert.match(service, /EMAIL_JOB_LEASE_MS/);
  assert.match(service, /retryDelayMs/);
  assert.match(service, /EmailJobStatus\.FAILED/);
  assert.match(service, /EmailJobStatus\.SENT/);
});

test("the API starts and gracefully stops the background email worker", async () => {
  const server = await readFile(serverFile("server.ts"), "utf8");

  assert.match(server, /startEmailWorker/);
  assert.match(server, /onCommitTrigger\(\s*EMAIL_JOB_COMMITTED/);
  assert.match(server, /emailWorker\?\.wake\(\)/);
  assert.match(server, /removeEmailCommitTrigger\?\.\(\)/);
  assert.match(server, /await emailWorker\?\.stop\(\)/);
  assert.match(server, /SIGINT/);
  assert.match(server, /SIGTERM/);
});

test("email-producing transactions emit one reusable post-commit trigger", async () => {
  const [users, expenses, semesters, worker] = await Promise.all([
    readFile(serverFile("controllers/user.controller.ts"), "utf8"),
    readFile(serverFile("service/expense.service.ts"), "utf8"),
    readFile(serverFile("service/semester-transition.service.ts"), "utf8"),
    readFile(serverFile("service/email-worker.ts"), "utf8"),
  ]);

  assert.match(users, /emitCommitTrigger\(EMAIL_JOB_COMMITTED\)/);
  assert.match(expenses, /emitCommitTrigger\(EMAIL_JOB_COMMITTED\)/);
  assert.match(semesters, /emitCommitTrigger\(EMAIL_JOB_COMMITTED\)/);
  assert.doesNotMatch(worker, /pollIntervalMs\s*=\s*5_000/);
});

test("SMTP delivery accepts the queue job's stable Message-ID", async () => {
  const mail = await readFile(serverFile("utils/mail.ts"), "utf8");

  assert.match(mail, /messageId\?:\s*string/);
  assert.match(mail, /messageId:\s*options\?\.messageId/);
});
