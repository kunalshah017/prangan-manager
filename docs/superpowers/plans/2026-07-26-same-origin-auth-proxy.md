# Same-Origin Authentication Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make production authentication cookies first-party by routing API
requests through the existing Vercel frontend origin.

**Architecture:** Add one external rewrite before the SPA fallback and make the
production API base relative. Keep Azure, CSRF validation, session cookies, and
local development unchanged.

**Tech Stack:** Vercel rewrites, Vite, TypeScript, Vitest, Azure Web App.

---

### Task 1: Add the failing deployment contract

**Files:**

- Create: `client/src/tests/config/same-origin-api-proxy.test.ts`

- [ ] **Step 1: Write the failing test**

Read `client/vercel.json` and `client/src/lib/api-client.ts`. Assert that the
first rewrite proxies `/api/v1/:path*` to the exact Azure `/api/v1/:path*`
destination, the SPA fallback remains last, and the production branch uses the
literal relative base `/api/v1`.

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm run test:run -- src/tests/config/same-origin-api-proxy.test.ts
```

Expected: failure because the API rewrite and same-origin production base do not
exist.

### Task 2: Implement the minimal proxy

**Files:**

- Modify: `client/vercel.json`
- Modify: `client/src/lib/api-client.ts`

- [ ] **Step 1: Add the external rewrite**

Insert this rule before the SPA fallback:

```json
{
  "source": "/api/v1/:path*",
  "destination": "https://prangan-manager-api-awbfgggjadahbqc6.centralindia-01.azurewebsites.net/api/v1/:path*"
}
```

- [ ] **Step 2: Use the relative production API base**

Set the production branch of `API_BASE_URL` to `"/api/v1"`. Preserve the
development environment override and localhost fallback.

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm run test:run -- src/tests/config/same-origin-api-proxy.test.ts
```

Expected: pass.

### Task 3: Update the internal deployment handbook

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Document the production routing**

Explain that production browser requests use the frontend-domain `/api/v1`
proxy, while `VITE_API_BASE_URL` is a development override. Add the proxy check
to authentication troubleshooting.

### Task 4: Verify and deploy

**Files:**

- No additional source files.

- [ ] **Step 1: Run client verification**

Run:

```bash
npm run test:run
npm run lint
npm run build
```

Expected: all commands exit successfully.

- [ ] **Step 2: Validate formatting and review the diff**

Run:

```bash
git diff --check
git status --short
```

- [ ] **Step 3: Commit and push**

Commit the proxy, tests, documentation, specification, and plan, then push the
current `main` branch.

- [ ] **Step 4: Verify the production deployment**

Confirm the frontend-domain CSRF endpoint returns JSON through the proxy, then
perform a complete browser login and verify `/users/me` and `/projects` succeed
through `manager.pranganfoundation.org/api/v1`.
