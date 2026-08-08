# Semester Dashboard Bank-Details Attention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the semester dashboard's Needs attention section first on mobile and remind the signed-in user until all six payment-detail fields are complete.

**Architecture:** Add one pure completeness helper beside the existing dashboard model so the rule is independently testable. Reuse one in-file attention-section component for mobile and desktop, passing distinct heading IDs and responsive classes; add the bank reminder as the first existing attention item using the current user payload and profile payment route.

**Tech Stack:** React 19, TypeScript, React Router, Tailwind CSS, Vitest

---

## File map

- Modify `client/src/lib/dashboard.ts`: export the pure six-field payment-detail completeness rule.
- Modify `client/src/tests/lib/dashboard.test.ts`: cover complete, missing, and whitespace-only payment details.
- Modify `client/src/pages/semesters/Dashboard.tsx`: add the bank reminder, reusable attention renderer, and mobile-first placement.
- Modify `client/src/tests/pages/dashboard.test.ts`: assert reminder content/action and responsive source ordering.

### Task 1: Payment-detail completeness rule

**Files:**
- Modify: `client/src/lib/dashboard.ts`
- Test: `client/src/tests/lib/dashboard.test.ts`

- [ ] **Step 1: Write the failing tests**

Update the dashboard test import and add a complete payment-details fixture plus focused assertions:

```ts
import {
  buildDashboardModel,
  hasCompleteBankDetails,
} from "@/lib/dashboard";

const completeBankDetails = {
  bankAccountNumber: "1234567890",
  bankAccountName: "Asha Patil",
  bankIfsc: "ABCD0123456",
  bankName: "Example Bank",
  bankBranch: "Pune",
  upiId: "asha@example",
};

describe("hasCompleteBankDetails", () => {
  it("requires all six payment-detail fields", () => {
    expect(hasCompleteBankDetails(completeBankDetails)).toBe(true);

    for (const field of Object.keys(completeBankDetails) as Array<
      keyof typeof completeBankDetails
    >) {
      expect(
        hasCompleteBankDetails({
          ...completeBankDetails,
          [field]: null,
        }),
      ).toBe(false);
    }
  });

  it("treats absent users and whitespace-only values as incomplete", () => {
    expect(hasCompleteBankDetails(null)).toBe(false);
    expect(
      hasCompleteBankDetails({
        ...completeBankDetails,
        bankBranch: "   ",
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:run -- src/tests/lib/dashboard.test.ts
```

Expected: FAIL because `@/lib/dashboard` does not export `hasCompleteBankDetails`.

- [ ] **Step 3: Implement the minimal pure helper**

Add to `client/src/lib/dashboard.ts`:

```ts
type BankDetails = Pick<
  User,
  | "bankAccountNumber"
  | "bankAccountName"
  | "bankIfsc"
  | "bankName"
  | "bankBranch"
  | "upiId"
>;

export const hasCompleteBankDetails = (
  user: BankDetails | null | undefined,
) =>
  Boolean(
    user &&
      [
        user.bankAccountNumber,
        user.bankAccountName,
        user.bankIfsc,
        user.bankName,
        user.bankBranch,
        user.upiId,
      ].every((value) => value?.trim()),
  );
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npm run test:run -- src/tests/lib/dashboard.test.ts
```

Expected: PASS for the existing dashboard-model tests and the new completeness tests.

- [ ] **Step 5: Commit the behavior**

```bash
git add client/src/lib/dashboard.ts client/src/tests/lib/dashboard.test.ts
git commit -m "feat: detect incomplete bank details"
```

### Task 2: Mobile-first Needs attention reminder

**Files:**
- Modify: `client/src/pages/semesters/Dashboard.tsx`
- Test: `client/src/tests/pages/dashboard.test.ts`

- [ ] **Step 1: Write the failing dashboard wiring tests**

Add a source-contract test to `client/src/tests/pages/dashboard.test.ts`:

```ts
it("puts Needs attention before mobile tools and links incomplete bank details to payment settings", () => {
  expect(dashboard).toContain("hasCompleteBankDetails(user)");
  expect(dashboard).toContain('title: "Complete your bank details"');
  expect(dashboard).toContain('actionLabel: "Complete bank details"');
  expect(dashboard).toContain('href: "/profile#payment"');
  expect(dashboard).toContain('className="sm:hidden"');
  expect(dashboard).toContain('className="hidden sm:block"');
  expect(dashboard.indexOf('headingId="mobile-attention-title"')).toBeLessThan(
    dashboard.indexOf('aria-label="Mobile semester tools"'),
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm run test:run -- src/tests/pages/dashboard.test.ts
```

Expected: FAIL because the bank reminder, action label, and responsive shared renderer do not exist.

- [ ] **Step 3: Add the shared attention renderer**

In `client/src/pages/semesters/Dashboard.tsx`, import `hasCompleteBankDetails`, define the item type, and add one component above `Dashboard`:

```tsx
type AttentionItem = {
  title: string;
  detail: string;
  href: string;
  actionLabel?: string;
};

function AttentionSection({
  items,
  headingId,
  className,
}: {
  items: AttentionItem[];
  headingId: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-xl font-semibold text-foreground">
          Needs attention
        </h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
            items.length
              ? "bg-warning/15 text-warning-foreground"
              : "bg-success/15 text-success-foreground",
          )}
          aria-label={`${items.length} attention item${items.length === 1 ? "" : "s"}`}
        >
          {items.length}
        </span>
      </div>
      {items.length ? (
        <div className="mt-4 divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item.title}
              to={item.href}
              className="group flex min-h-11 items-start gap-3 py-4 first:pt-2 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning-foreground">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground group-hover:text-primary">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </span>
                {item.actionLabel && (
                  <span className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground group-hover:bg-primary/90">
                    {item.actionLabel}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-start gap-3 rounded-md bg-muted/45 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">No immediate follow-up</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Your permitted semester checks are clear for now.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Add the bank reminder as the first attention item**

Import the helper with the dashboard model and prepend this branch to `attentionItems`, keeping the existing filters:

```ts
!hasCompleteBankDetails(user)
  ? {
      title: "Complete your bank details",
      detail:
        "Add all payment details so your remuneration can be processed.",
      href: "/profile#payment",
      actionLabel: "Complete bank details",
    }
  : null,
```

Change the filter type guard to `AttentionItem`.

- [ ] **Step 5: Render mobile attention before tools and retain desktop placement**

Immediately after `WorkspacePageHeader`, preserve the compact all-clear branch and render the shared card only when mobile has items:

```tsx
{attentionItems.length === 0 ? (
  <div
    aria-label="Mobile semester status"
    className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm sm:hidden"
  >
    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">All caught up</p>
      <p className="truncate text-xs text-muted-foreground">
        No immediate follow-up in your workspace.
      </p>
    </div>
  </div>
) : (
  <AttentionSection
    items={attentionItems}
    headingId="mobile-attention-title"
    className="sm:hidden"
  />
)}
```

Keep the existing mobile tools directly after that branch. Replace the old in-column section with:

```tsx
<AttentionSection
  items={attentionItems}
  headingId="attention-title"
  className="hidden sm:block"
/>
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
npm run test:run -- src/tests/lib/dashboard.test.ts src/tests/pages/dashboard.test.ts
```

Expected: PASS for both completeness behavior and dashboard wiring/layout.

- [ ] **Step 7: Run client validation**

Run:

```bash
npm run lint
npm run build
npm run test:run
```

Expected: all commands exit successfully with no new lint, TypeScript, build, or test failures.

- [ ] **Step 8: Commit the dashboard feature and plan**

```bash
git add client/src/pages/semesters/Dashboard.tsx client/src/tests/pages/dashboard.test.ts docs/superpowers/plans/2026-08-08-semester-dashboard-bank-details-attention.md
git commit -m "feat: surface pending bank details on dashboard"
```
