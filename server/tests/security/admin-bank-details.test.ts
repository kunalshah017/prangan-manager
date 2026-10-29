import assert from "node:assert/strict";
import test from "node:test";

import { updateUserBankDetailsAsAdmin } from "../../controllers/user.controller.js";
import { Role } from "../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";

const createReply = () => {
  let statusCode: number | undefined;
  let payload: unknown;
  const reply = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    send(value: unknown) {
      payload = value;
      return this;
    },
  };
  return {
    reply,
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
  };
};

const admin = { id: "admin-1", name: "Admin", email: "admin@example.com", role: Role.ADMIN };
const volunteer = { id: "user-1", name: "Volunteer", email: "user@example.com", role: Role.USER };

const withPrismaUser = async (
  stored: Record<string, string | null>,
  run: (updates: unknown[]) => Promise<void>,
) => {
  const originalUpdate = prisma.user.update;
  const originalFindUnique = prisma.user.findUnique;
  const updates: unknown[] = [];
  prisma.user.update = (async (args: { data: Record<string, string> }) => {
    updates.push(args.data);
    Object.assign(stored, args.data);
    return {} as never;
  }) as unknown as typeof prisma.user.update;
  prisma.user.findUnique = (async () => ({ ...stored })) as unknown as typeof prisma.user.findUnique;
  try {
    await run(updates);
  } finally {
    prisma.user.update = originalUpdate;
    prisma.user.findUnique = originalFindUnique;
  }
};

test("only admins can edit another user's bank details", async () => {
  await withPrismaUser({}, async (updates) => {
    const response = createReply();
    await updateUserBankDetailsAsAdmin(
      { user: volunteer, params: { userId: "user-2" }, body: { bankIfsc: "SBIN0001234" } } as never,
      response.reply as never,
    );
    assert.equal(response.statusCode, 403);
    assert.equal(updates.length, 0);
  });
});

test("an admin edit changes only the filled-in fields and echoes a masked summary", async () => {
  const stored = {
    bankAccountNumber: "123456789012",
    bankName: "State Bank of India",
    bankIfsc: "SBIN0001234",
    upiId: "volunteer@upi",
  };
  await withPrismaUser(stored, async (updates) => {
    const response = createReply();
    await updateUserBankDetailsAsAdmin(
      {
        user: admin,
        params: { userId: "user-1" },
        // A blank account number means "keep it", not "clear it".
        body: { bankAccountNumber: "   ", bankIfsc: " barb0vjmoho ", bankName: "Bank of Baroda" },
      } as never,
      response.reply as never,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(updates, [{ bankIfsc: "BARB0VJMOHO", bankName: "Bank of Baroda" }]);
    const serialized = JSON.stringify(response.payload);
    assert.match(serialized, /"accountLast4":"9012"/);
    assert.doesNotMatch(serialized, /123456789012/);
    assert.doesNotMatch(serialized, /volunteer@upi/);
  });
});

test("an admin edit rejects a malformed IFSC and an empty change", async () => {
  await withPrismaUser({}, async (updates) => {
    const invalid = createReply();
    await updateUserBankDetailsAsAdmin(
      { user: admin, params: { userId: "user-1" }, body: { bankIfsc: "NOT-AN-IFSC" } } as never,
      invalid.reply as never,
    );
    assert.equal(invalid.statusCode, 400);

    const empty = createReply();
    await updateUserBankDetailsAsAdmin(
      { user: admin, params: { userId: "user-1" }, body: { bankAccountNumber: "" } } as never,
      empty.reply as never,
    );
    assert.equal(empty.statusCode, 400);
    assert.equal(updates.length, 0);
  });
});
