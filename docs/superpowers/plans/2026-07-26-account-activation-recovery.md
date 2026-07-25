# Account Activation Recovery Implementation Plan

> **Execution:** Implement this plan in the current workspace using test-driven
> development and verify all affected server and client behavior before completion.

**Goal:** Keep activation links secure while giving educators 24 hours to use them
and a clear recovery path if a link is unusable.

**Architecture:** Preserve the existing account-token lifecycle and password-reset
flow. Select token lifetime by token type at creation time, improve transactional
email copy, and expose the existing reset flow from the activation form after an
error. Apply a separately guarded one-time database repair to the eight confirmed
expired and unused activation records.

**Tech Stack:** TypeScript, Prisma, Node test runner, React, React Router, Vitest,
Tailwind CSS.

---

### Task 1: Guarded one-time token repair

**Files:**

- No repository file changes.

**Steps:**

1. Load sent `registration-approved:*` email jobs without printing sensitive data.
2. Parse activation URLs, hash raw tokens, and select expired, unused activation
   records.
3. Abort unless exactly eight records match.
4. Update only those still-expired, still-unused record IDs to a common expiry 24
   hours in the future.
5. Verify and print only aggregate counts and the new expiry.

### Task 2: Token-type-specific lifetimes

**Files:**

- Modify: `server/tests/security/account-token-service.test.ts`
- Modify: `server/service/account-token.service.ts`

**Steps:**

1. Add a failing service test asserting approximately 24 hours for activation and
   one hour for password reset.
2. Run the focused test and confirm the activation assertion fails.
3. Replace the shared lifetime with a token-type-specific lifetime map.
4. Run the focused test and confirm it passes.

### Task 3: Deadline-aware account emails

**Files:**

- Modify: `server/tests/email/account-email.test.ts`
- Modify: `server/constants/email_templates.ts`

**Steps:**

1. Add failing assertions for a 24-hour activation deadline and one-hour reset
   deadline.
2. Run the focused test and confirm it fails.
3. Add concise deadline and recovery copy to the existing templates.
4. Run the focused test and confirm it passes.

### Task 4: Activation error recovery

**Files:**

- Modify: `client/src/tests/pages/account-token-form.test.ts`
- Modify: `client/src/pages/AccountTokenForm.tsx`

**Steps:**

1. Add failing checks for an accessible activation error state and a direct
   `/reset-password` recovery action.
2. Run the focused client test and confirm it fails.
3. Track activation recovery visibility as local form state.
4. Show a responsive, semantic alert with a reset-link action for missing or
   rejected activation tokens.
5. Run the focused client test and confirm it passes.

### Task 5: Documentation and full verification

**Files:**

- Modify: `README.md`

**Steps:**

1. Document activation/reset lifetimes and the recovery behavior in the internal
   handbook.
2. Run all server tests and build.
3. Run all client tests, lint, and build.
4. Run Prisma validation and `git diff --check`.
5. Review the final diff for unrelated or sensitive changes.
