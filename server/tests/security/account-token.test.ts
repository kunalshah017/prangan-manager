import assert from "node:assert/strict";
import test from "node:test";

import {
  createRawAccountToken,
  hashAccountToken,
  isUsableAccountToken,
} from "../../security/account-token.js";

test("account tokens are random and persisted only as SHA-256 hashes", () => {
  const rawToken = createRawAccountToken();
  const hash = hashAccountToken(rawToken);

  assert.notEqual(hash, rawToken);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash, hashAccountToken(rawToken));
});

test("account tokens are usable only before expiry and before consumption", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");

  assert.equal(
    isUsableAccountToken(
      { expiresAt: new Date("2026-07-17T12:01:00.000Z"), usedAt: null },
      now,
    ),
    true,
  );
  assert.equal(
    isUsableAccountToken(
      { expiresAt: new Date("2026-07-17T11:59:00.000Z"), usedAt: null },
      now,
    ),
    false,
  );
  assert.equal(
    isUsableAccountToken(
      { expiresAt: new Date("2026-07-17T12:01:00.000Z"), usedAt: now },
      now,
    ),
    false,
  );
});
