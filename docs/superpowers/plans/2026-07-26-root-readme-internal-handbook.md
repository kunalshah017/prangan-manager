# Root README internal handbook implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a complete internal root README that accurately documents Prangan Manager for engineers, administrators, and operators.

**Architecture:** Keep `README.md` as the repository entry point and link to existing detailed runbooks for procedures that already have a canonical home. Derive commands, configuration, roles, and architecture from the current source rather than from assumptions.

**Tech Stack:** Markdown, React 19, Vite 7, Fastify 5, Prisma 6, PostgreSQL, Node.js 22, Vercel, Azure App Service

---

### Task 1: Build the handbook

**Files:**
- Create: `README.md`
- Reference: `client/package.json`
- Reference: `server/package.json`
- Reference: `client/src/lib/access.ts`
- Reference: `client/src/App.tsx`
- Reference: `server/server.ts`
- Reference: `server/prisma/schema.prisma`
- Reference: `client/.env.example`
- Reference: `server/.env.example`
- Reference: `docs/OPERATIONS.md`
- Reference: `docs/OPERATIONS_MANAGED_LEVELS.md`

- [x] **Step 1: Write the product, hierarchy, role, feature, and architecture sections**

Document only capabilities and permission behavior present in the referenced
source files. Include a compact Mermaid architecture diagram and a role table.

- [x] **Step 2: Write local setup and configuration**

Include Node.js 22, PostgreSQL, `npm ci`, environment-file creation, Prisma
generation and migration, and the two local development processes. Set the
local API to port `4000` because the client development fallback targets
`http://localhost:4000/api/v1`.

- [x] **Step 3: Write testing, data operations, deployment, and troubleshooting**

Use exact npm scripts from the client and server package files. Explain that
destructive fixture reset requires all local safety flags and that production
migrations remain an explicit operator action. Document the Vercel client and
Azure App Service API release path.

### Task 2: Verify the handbook

**Files:**
- Verify: `README.md`

- [x] **Step 1: Verify commands, scripts, variables, and links**

Run source comparisons with `rg`, validate every local Markdown link target,
and confirm every documented npm script exists.

- [x] **Step 2: Review the prose**

Remove placeholders, contradictions, copied secrets, em or en dashes,
promotional wording, and unnecessary repetition.

- [x] **Step 3: Check repository hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors, with the new README and its supporting
documentation as the only changes from this task.
