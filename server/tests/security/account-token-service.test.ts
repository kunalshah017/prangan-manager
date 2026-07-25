import assert from "node:assert/strict";
import test from "node:test";

import { AccountTokenType } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";
import * as accountTokenService from "../../service/account-token.service.js";

const {
  consumeAccountTokenAndSetPassword,
  createAccountToken,
} = accountTokenService;

test("internal token creation returns its operation ID without persisting the raw token", async () => {
  const createRecord = (
    accountTokenService as typeof accountTokenService & {
      createAccountTokenRecordInTransaction?: (
        transaction: any,
        userId: string,
        type: AccountTokenType,
      ) => Promise<{ id: string; rawToken: string }>;
    }
  ).createAccountTokenRecordInTransaction;
  assert.equal(typeof createRecord, "function");

  let persistedHash = "";
  const result = await createRecord!(
    {
      accountToken: {
        updateMany: async () => ({ count: 0 }),
        create: async ({ data }: any) => {
          persistedHash = data.tokenHash;
          return { id: "token-1", ...data };
        },
      },
    },
    "user-1",
    AccountTokenType.PASSWORD_RESET,
  );

  assert.equal(result.id, "token-1");
  assert.notEqual(result.rawToken, persistedHash);
  assert.match(persistedHash, /^[a-f0-9]{64}$/);
});

test("activation tokens last 24 hours while password reset tokens last one hour", async () => {
  const expiries = new Map<AccountTokenType, Date>();
  const transaction = {
    accountToken: {
      updateMany: async () => ({ count: 0 }),
      create: async ({ data }: any) => {
        expiries.set(data.type, data.expiresAt);
        return { id: `token-${data.type}`, ...data };
      },
    },
  };
  const before = Date.now();

  await accountTokenService.createAccountTokenRecordInTransaction(
    transaction as any,
    "user-1",
    AccountTokenType.ACTIVATION,
  );
  await accountTokenService.createAccountTokenRecordInTransaction(
    transaction as any,
    "user-1",
    AccountTokenType.PASSWORD_RESET,
  );

  const after = Date.now();
  const activationExpiry = expiries.get(AccountTokenType.ACTIVATION)?.getTime();
  const resetExpiry = expiries.get(AccountTokenType.PASSWORD_RESET)?.getTime();
  assert.ok(activationExpiry);
  assert.ok(resetExpiry);
  assert.ok(activationExpiry >= before + 24 * 60 * 60 * 1000);
  assert.ok(activationExpiry <= after + 24 * 60 * 60 * 1000);
  assert.ok(resetExpiry >= before + 60 * 60 * 1000);
  assert.ok(resetExpiry <= after + 60 * 60 * 1000);
});

test("issuing an account token invalidates prior unused tokens of the same type", async () => {
  const originalTransaction = prisma.$transaction;
  let invalidated = false;
  let persistedHash = "";

  prisma.$transaction = (async (callback: any) =>
    callback({
      accountToken: {
        updateMany: async () => {
          invalidated = true;
          return { count: 1 };
        },
        create: async ({ data }: any) => {
          persistedHash = data.tokenHash;
          return data;
        },
      },
    })) as any;

  try {
    const rawToken = await createAccountToken(
      "user-1",
      AccountTokenType.ACTIVATION,
    );

    assert.equal(invalidated, true);
    assert.notEqual(persistedHash, rawToken);
    assert.match(persistedHash, /^[a-f0-9]{64}$/);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

test("consuming a live account token changes password and increments session version once", async () => {
  const originalTransaction = prisma.$transaction;
  const writes: string[] = [];

  prisma.$transaction = (async (callback: any) =>
    callback({
      accountToken: {
        findUnique: async () => ({
          id: "token-1",
          userId: "user-1",
          type: AccountTokenType.PASSWORD_RESET,
          expiresAt: new Date("2099-01-01T00:00:00.000Z"),
          usedAt: null,
        }),
        updateMany: async () => {
          writes.push("consume");
          return { count: 1 };
        },
      },
      user: {
        update: async ({ data }: any) => {
          writes.push("password");
          assert.equal(data.sessionVersion.increment, 1);
          assert.notEqual(data.password, "new-password");
        },
      },
    })) as any;

  try {
    assert.equal(
      await consumeAccountTokenAndSetPassword({
        rawToken: "raw-token",
        type: AccountTokenType.PASSWORD_RESET,
        password: "new-password",
      }),
      true,
    );
    assert.deepEqual(writes, ["consume", "password"]);
  } finally {
    prisma.$transaction = originalTransaction;
  }
});
