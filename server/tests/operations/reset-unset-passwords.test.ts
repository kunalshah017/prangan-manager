import assert from "node:assert/strict";
import test from "node:test";
import bcryptjs from "bcryptjs";

import {
  runResetUnsetPasswords,
  setOwnPassword,
} from "../../scripts/reset-unset-passwords.js";

const at = (value: string) => new Date(value);

test("a link replaced by a newer one does not count as setting a password", () => {
  const replaced = [
    { type: "PASSWORD_RESET", createdAt: at("2026-08-01T10:00:00Z"), usedAt: at("2026-08-01T10:05:00Z") },
    { type: "PASSWORD_RESET", createdAt: at("2026-08-01T10:05:00Z"), usedAt: null },
  ];
  const used = [
    { type: "PASSWORD_RESET", createdAt: at("2026-08-01T10:00:00Z"), usedAt: at("2026-08-01T10:20:00Z") },
  ];

  assert.equal(setOwnPassword(replaced), false);
  assert.equal(setOwnPassword(used), true);
  assert.equal(setOwnPassword([]), false);
});

test("only accounts with a public or emailed password are reset", async () => {
  const hash = (password: string) => bcryptjs.hashSync(password, 4);
  const users = [
    { id: "placeholder", email: "new@example.com", status: "APPROVED", createdAt: at("2026-09-01T00:00:00Z"), password: hash("pending-account-password"), accountTokens: [] },
    { id: "seed-admin", email: "admin@example.com", status: "APPROVED", createdAt: at("2025-07-12T00:00:00Z"), password: hash("Prangan@2025"), accountTokens: [] },
    { id: "legacy", email: "legacy@example.com", status: "APPROVED", createdAt: at("2026-01-01T00:00:00Z"), password: hash("AshaShah#4821"), accountTokens: [] },
    { id: "legacy-reset", email: "reset@example.com", status: "APPROVED", createdAt: at("2026-01-01T00:00:00Z"), password: hash("their own"), accountTokens: [{ type: "PASSWORD_RESET", createdAt: at("2026-08-01T10:00:00Z"), usedAt: at("2026-08-01T10:20:00Z") }] },
    { id: "activated", email: "active@example.com", status: "APPROVED", createdAt: at("2026-09-01T00:00:00Z"), password: hash("their own"), accountTokens: [{ type: "ACTIVATION", createdAt: at("2026-09-02T10:00:00Z"), usedAt: at("2026-09-02T11:00:00Z") }] },
  ];
  const updated: string[] = [];
  const prisma = {
    user: {
      findMany: async () => users,
      update: async ({ where }: { where: { id: string } }) => {
        updated.push(where.id);
        return {};
      },
    },
    $transaction: async (operations: unknown[]) => operations,
  };

  const dryRun = await runResetUnsetPasswords({ apply: false }, prisma);
  assert.deepEqual(
    dryRun.accounts.map((account) => account.email),
    ["new@example.com", "admin@example.com", "legacy@example.com"],
  );
  assert.deepEqual(updated, []);

  await runResetUnsetPasswords({ apply: true }, prisma);
  assert.deepEqual(updated.sort(), ["legacy", "placeholder", "seed-admin"]);
});
