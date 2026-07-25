import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../../prisma/schema.prisma", import.meta.url);
const migrationUrl = new URL(
  "../../prisma/migrations/20260725210000_add_semester_expenses/migration.sql",
  import.meta.url,
);

test("expense schema defines the scoped ledger, audit relations, and indexes", async () => {
  const schema = await readFile(schemaUrl, "utf8");

  assert.match(schema, /enum ExpenseStatus\s*\{[\s\S]*ACTIVE[\s\S]*VOIDED[\s\S]*\}/);
  assert.match(
    schema,
    /model Expense\s*\{[\s\S]*projectId\s+String[\s\S]*centerId\s+String[\s\S]*semesterId\s+String[\s\S]*expenseType\s+String[\s\S]*amount\s+Decimal\s+@db\.Decimal\(12,\s*2\)[\s\S]*sourceKey\s+String\?\s+@unique[\s\S]*status\s+ExpenseStatus\s+@default\(ACTIVE\)[\s\S]*\}/,
  );
  assert.match(
    schema,
    /@@index\(\[projectId,\s*centerId,\s*semesterId,\s*incurredOn\]\)/,
  );
  assert.match(
    schema,
    /@@index\(\[semesterId,\s*expenseType,\s*status,\s*incurredOn\]\)/,
  );
  assert.match(
    schema,
    /@@index\(\[payeeUserId,\s*semesterId,\s*incurredOn\]\)/,
  );

  for (const model of ["Projects", "Centers", "Semesters"]) {
    assert.match(
      schema,
      new RegExp(`model ${model}\\s*\\{[\\s\\S]*expenses\\s+Expense\\[\\]`),
    );
  }
  assert.match(schema, /expensesReceived\s+Expense\[\]\s+@relation\("ExpensePayee"\)/);
  assert.match(schema, /expensesCreated\s+Expense\[\]\s+@relation\("ExpenseCreatedBy"\)/);
  assert.match(schema, /expensesVoided\s+Expense\[\]\s+@relation\("ExpenseVoidedBy"\)/);
});

test("expense migration enforces nonnegative amounts and complete void metadata", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /CREATE TYPE "ExpenseStatus"/);
  assert.match(migration, /CREATE TABLE "Expense"/);
  assert.match(migration, /UNIQUE INDEX "Expense_sourceKey_key"/);
  assert.match(migration, /"amount"\s*>=\s*0/);
  assert.match(
    migration,
    /"status"\s*=\s*'ACTIVE'[\s\S]*"voidedBy" IS NULL[\s\S]*"voidedAt" IS NULL[\s\S]*"voidReason" IS NULL[\s\S]*OR[\s\S]*"status"\s*=\s*'VOIDED'[\s\S]*"voidedBy" IS NOT NULL[\s\S]*"voidedAt" IS NOT NULL[\s\S]*"voidReason" IS NOT NULL/,
  );
});
