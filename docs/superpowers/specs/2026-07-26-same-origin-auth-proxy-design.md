# Same-Origin Authentication Proxy Design

**Date:** 2026-07-26

## Problem

The production frontend runs at `manager.pranganfoundation.org`, while its API
runs at an `azurewebsites.net` origin. The API correctly marks session and CSRF
cookies `Secure`, `HttpOnly`, and `SameSite=None`, but browsers may still block
them as third-party cookies. When that happens, login returns success but the
subsequent authenticated request has no session cookie and the client returns to
the login page.

The failure varies by browser profile because existing cookie state, privacy
settings, and private-browsing policy differ. Production API and live-browser
tests confirmed that the affected account, password, role assignment, and server
session lifecycle are otherwise valid.

## Decision

Use Vercel's external rewrite support to expose the existing Azure API through
the frontend origin:

```text
https://manager.pranganfoundation.org/api/v1/*
  -> https://prangan-manager-api-awbfgggjadahbqc6.centralindia-01.azurewebsites.net/api/v1/*
```

Production client requests will use the relative base `/api/v1`. Development
continues to use `VITE_API_BASE_URL`, falling back to
`http://localhost:4000/api/v1`.

## Security and Operational Behaviour

- Session and CSRF cookies remain server-issued, secure, and HTTP-only.
- The browser receives the proxied response from the frontend origin, so the
  cookies are first-party.
- CSRF validation remains unchanged.
- Azure remains the only application server and database client.
- Authenticated API responses must not be cached by the proxy. The rewrite does
  not enable Vercel rewrite caching.
- The API rewrite must appear before the SPA fallback so API requests are never
  served `index.html`.
- The direct Azure API remains available for operational diagnostics and local
  development.

## Alternatives Rejected

- Requiring users to enable third-party cookies is inconsistent and weakens
  browser privacy expectations.
- A custom Azure hostname under `pranganfoundation.org` would also solve the
  site boundary, but requires DNS, certificate, and Azure custom-domain work.
- Moving authentication tokens to browser storage would weaken the existing
  HTTP-only cookie design.

## Verification

- A configuration test reads `client/vercel.json` and verifies the external API
  rewrite precedes the SPA fallback.
- A source contract test verifies production uses `/api/v1` while development
  retains its current override and localhost fallback.
- Existing client tests, lint, and build remain green.
- After deployment, `/api/v1/auth/csrf` on the frontend domain must return JSON
  and a session bootstrap cookie rather than `index.html`.
- A production browser login must reach `/projects`, load `/users/me`, and load
  projects through the frontend-domain API path.
