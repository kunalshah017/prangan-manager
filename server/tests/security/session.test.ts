import assert from "node:assert/strict";
import test from "node:test";

import {
  createSessionToken,
  getAllowedClientOrigin,
  getAllowedClientOrigins,
  getSessionCookieOptions,
  readSessionToken,
} from "../../security/session.js";
import { hasMatchingCsrfToken } from "../../security/csrf.js";

test("production sessions require an explicit client origin", () => {
  assert.throws(
    () => getAllowedClientOrigin({ NODE_ENV: "production" }),
    /CLIENT_ORIGIN/,
  );
  assert.equal(
    getAllowedClientOrigin({ NODE_ENV: "development" }),
    "http://localhost:5173",
  );
  assert.equal(
    getAllowedClientOrigin({
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.prangan.example",
    }),
    "https://app.prangan.example",
  );
  assert.equal(
    getAllowedClientOrigin({ WEBSITE_SITE_NAME: "prangan-manager-api" }),
    "https://manager.pranganfoundation.org",
  );
  assert.deepEqual(
    getAllowedClientOrigins({ WEBSITE_SITE_NAME: "prangan-manager-api" }),
    [
      "https://manager.pranganfoundation.org",
      "https://prangan-manager.vercel.app",
    ],
  );
  assert.deepEqual(
    getAllowedClientOrigins({
      NODE_ENV: "production",
      CLIENT_ORIGIN: "https://app.prangan.example",
    }),
    ["https://app.prangan.example"],
  );
});

test("session cookies are HttpOnly and secure for production cross-origin clients", () => {
  const development = getSessionCookieOptions({ NODE_ENV: "development" });
  const production = getSessionCookieOptions({ NODE_ENV: "production" });
  const azure = getSessionCookieOptions({
    WEBSITE_SITE_NAME: "prangan-manager-api",
  });

  assert.equal(development.httpOnly, true);
  assert.equal(development.secure, false);
  assert.equal(development.sameSite, "lax");
  assert.equal(production.httpOnly, true);
  assert.equal(production.secure, true);
  assert.equal(production.sameSite, "none");
  assert.equal(azure.secure, true);
  assert.equal(azure.sameSite, "none");
});

test("CSRF validation requires a timing-safe exact token match", () => {
  assert.equal(hasMatchingCsrfToken("token", "token"), true);
  assert.equal(hasMatchingCsrfToken("token", "different"), false);
  assert.equal(hasMatchingCsrfToken(undefined, "token"), false);
  assert.equal(hasMatchingCsrfToken("token", undefined), false);
});

test("session tokens bind authentication to the current session version", () => {
  const environment = { JWT_SECRET: "test-secret" };
  const token = createSessionToken("user-1", 4, environment);

  assert.deepEqual(readSessionToken(token, environment), {
    userId: "user-1",
    sessionVersion: 4,
  });
  assert.equal(readSessionToken(token, { JWT_SECRET: "other-secret" }), null);
});
