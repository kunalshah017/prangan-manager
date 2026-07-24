import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Role, UserStatus } from "../../generated/prisma/index.js";
import { toAuthenticatedIdentity } from "../../security/authentication.js";

const user = {
  id: "user-1",
  name: "Approved User",
  email: "approved@example.com",
  role: Role.USER,
};

test("APPROVED returns an identity without status", () => {
  const identity = toAuthenticatedIdentity({
    ...user,
    status: UserStatus.APPROVED,
  });

  assert.deepEqual(identity, user);
  assert.equal("status" in identity, false);
});

test("PENDING returns null", () => {
  const identity = toAuthenticatedIdentity({
    ...user,
    status: UserStatus.PENDING,
  });

  assert.equal(identity, null);
});

test("REJECTED returns null", () => {
  const identity = toAuthenticatedIdentity({
    ...user,
    status: UserStatus.REJECTED,
  });

  assert.equal(identity, null);
});

test("authentication failures use one stable generic 401 message", async () => {
  const source = await readFile(
    new URL("../../utils/authChecker.ts", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /export const AUTHENTICATION_FAILURE_MESSAGE = "Unauthorized";/,
  );

  const unauthorizedCalls = source.matchAll(
    /errorHandle\(\s*([^,\n]+),\s*reply,\s*401\s*\)/g,
  );
  const messages = Array.from(unauthorizedCalls, (match) => match[1].trim());

  assert.ok(messages.length >= 4, "expected every authentication failure path");
  assert.deepEqual(
    new Set(messages),
    new Set(["AUTHENTICATION_FAILURE_MESSAGE"]),
  );
  assert.doesNotMatch(source, /errorHandle\(\s*["'`]Unauthorized/);
});
