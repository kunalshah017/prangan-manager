import assert from "node:assert/strict";
import test from "node:test";
import {
  EMAIL_JOB_LEASE_MS,
  EMAIL_JOB_MAX_ATTEMPTS,
  emailMessageId,
  isEmailJobClaimable,
  isFinalEmailAttempt,
  retryDelayMs,
} from "../../lib/email-queue-policy.js";

test("email jobs use a stable application-owned Message-ID", () => {
  assert.equal(
    emailMessageId("job-1"),
    "<email-job-job-1@manager.pranganfoundation.org>",
  );
  assert.equal(emailMessageId("job-1"), emailMessageId("job-1"));
});

test("email retry delays grow and remain capped", () => {
  assert.equal(retryDelayMs(1), 60_000);
  assert.equal(retryDelayMs(2), 120_000);
  assert.equal(retryDelayMs(20), 3_600_000);
});

test("pending and abandoned processing jobs are claimable when due", () => {
  const now = new Date("2026-07-25T12:00:00.000Z");

  assert.equal(
    isEmailJobClaimable(
      {
        status: "PENDING",
        availableAt: now,
        lockedAt: null,
      },
      now,
    ),
    true,
  );
  assert.equal(
    isEmailJobClaimable(
      {
        status: "PROCESSING",
        availableAt: now,
        lockedAt: new Date(now.getTime() - EMAIL_JOB_LEASE_MS - 1),
      },
      now,
    ),
    true,
  );
  assert.equal(
    isEmailJobClaimable(
      {
        status: "PROCESSING",
        availableAt: now,
        lockedAt: new Date(now.getTime() - EMAIL_JOB_LEASE_MS + 1),
      },
      now,
    ),
    false,
  );
  assert.equal(
    isEmailJobClaimable(
      {
        status: "SENT",
        availableAt: now,
        lockedAt: null,
      },
      now,
    ),
    false,
  );
});

test("the configured final attempt is terminal", () => {
  assert.equal(isFinalEmailAttempt(EMAIL_JOB_MAX_ATTEMPTS), true);
  assert.equal(isFinalEmailAttempt(EMAIL_JOB_MAX_ATTEMPTS - 1), false);
});
