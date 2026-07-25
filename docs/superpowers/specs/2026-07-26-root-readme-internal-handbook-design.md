# Root README internal handbook design

## Purpose

Create a root `README.md` that serves as the main internal handbook for Prangan
Manager. A new engineer or operator should be able to understand the product,
run it locally, verify a change, and follow the production release path without
having to reconstruct the system from source code.

The repository is private, so the handbook may describe internal architecture,
deployment platforms, route conventions, operational safeguards, and role
behavior. It must never contain credentials, access tokens, database URLs,
private keys, or real passwords.

## Audience

The handbook is written for:

- engineers setting up or changing the client and server;
- administrators who need to understand roles and semester workflows;
- operators handling database migrations, fixtures, deployments, and incident
  checks;
- reviewers who need the correct validation commands and source-of-truth
  documents.

## Structure

The README will contain:

1. a plain-language product overview and capability inventory;
2. the project, center, semester, and managed-level hierarchy;
3. the role and permission model, including exact workspace scoping;
4. the React client, Fastify API, Prisma/PostgreSQL database, email worker,
   media, PWA, and deployment architecture;
5. repository layout and canonical source locations;
6. local prerequisites, environment variables, installation, migrations, and
   startup commands;
7. test, lint, build, and database verification commands;
8. fixture, curriculum seed, and data-migration safeguards;
9. account, session, CSRF, CORS, and authorization behavior;
10. Vercel and Azure App Service release procedures;
11. troubleshooting for database schema drift, Prisma connectivity, CORS,
    email, PDF/library, PWA cache, and authorization failures;
12. links to detailed API and operations documents.

## Documentation boundaries

The root README is the entry point. Existing documents remain authoritative for
detailed operator procedures:

- `docs/OPERATIONS.md`
- `docs/OPERATIONS_MANAGED_LEVELS.md`
- `server/API_DOCS.md`

The README should summarize these procedures and link to them instead of
copying every step. Commands, script names, environment variables, routes, and
platform claims must be checked against current source files.

## Style

Use sentence-case headings, short paragraphs, tables where comparison matters,
and copyable shell commands. Avoid promotional language, filler, emojis, and
unexplained acronyms. The document should read as a maintained engineering
handbook, not a generated product page.

## Verification

Before completion:

- confirm every linked repository path exists;
- confirm every npm script appears in the relevant `package.json`;
- compare environment-variable tables with code usage and `.env.example`
  files;
- confirm local ports and API prefixes against Vite, the API client, and
  `server.ts`;
- scan for placeholders, secrets, contradictory setup steps, and stale claims;
- run Markdown-oriented source checks and `git diff --check`.
