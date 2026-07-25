import assert from "node:assert/strict";
import test from "node:test";

type AccountEmailModule = {
  buildRegistrationApprovalEmailJob: (input: {
    userId: string;
    email: string;
    name: string;
    activationUrl: string;
    roleAssignmentDetails: string;
  }) => { dedupeKey: string; subject: string; html: string };
  buildRegistrationRejectionEmailJob: (input: {
    userId: string;
    email: string;
    name: string;
    rejectionReason: string;
  }) => { dedupeKey: string; subject: string; html: string };
  buildPasswordResetEmailJob: (input: {
    accountTokenId: string;
    email: string;
    name: string;
    resetUrl: string;
  }) => { dedupeKey: string; subject: string; html: string };
};

const loadAccountEmailModule = async () =>
  import(new URL("../../email/account-email.js", import.meta.url).href)
    .then((module) => module as AccountEmailModule)
    .catch(() => null);

test("registration decision jobs are stable per reviewed user", async () => {
  const email = await loadAccountEmailModule();
  assert.ok(email, "account email job builders must exist");

  const approval = email.buildRegistrationApprovalEmailJob({
    userId: "user-1",
    email: "person@example.org",
    name: "Person",
    activationUrl: "https://manager.example.org/activate?token=secret",
    roleAssignmentDetails: "<p>Educator</p>",
  });
  const rejection = email.buildRegistrationRejectionEmailJob({
    userId: "user-1",
    email: "person@example.org",
    name: "Person",
    rejectionReason: "No opening is currently available.",
  });

  assert.equal(approval.dedupeKey, "registration-approved:user-1");
  assert.match(approval.html, /activate\?token=secret/);
  assert.match(approval.html, /24 hours/i);
  assert.match(approval.html, /request a new password link/i);
  assert.equal(rejection.dedupeKey, "registration-rejected:user-1");
  assert.equal(rejection.subject, "Registration Update - Prangan Foundation");
  assert.match(rejection.html, /No opening is currently available/);
});

test("each password reset token gets one independently deduplicated job", async () => {
  const email = await loadAccountEmailModule();
  assert.ok(email, "account email job builders must exist");

  const job = email.buildPasswordResetEmailJob({
    accountTokenId: "token-7",
    email: "person@example.org",
    name: "Person",
    resetUrl: "https://manager.example.org/reset-password?token=secret",
  });

  assert.equal(job.dedupeKey, "password-reset:token-7");
  assert.equal(job.subject, "Reset your Prangan password");
  assert.match(job.html, /reset-password\?token=secret/);
  assert.match(job.html, /one hour/i);
});
