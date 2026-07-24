import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { assertDestructiveLocalSeedAllowed } from "../../prisma/seed-safety.js";

test("destructive fixtures require an explicit local development environment", () => {
  assert.throws(
    () => assertDestructiveLocalSeedAllowed({ NODE_ENV: "production" }),
    /only run in NODE_ENV=development/,
  );
  assert.throws(
    () => assertDestructiveLocalSeedAllowed({ NODE_ENV: "development" }),
    /ALLOW_LOCAL_SEED=true/,
  );
  assert.throws(
    () =>
      assertDestructiveLocalSeedAllowed({
        NODE_ENV: "development",
        ALLOW_LOCAL_SEED: "true",
      }),
    /ALLOW_DESTRUCTIVE_SEED=true/,
  );
  assert.doesNotThrow(() =>
    assertDestructiveLocalSeedAllowed({
      NODE_ENV: "development",
      ALLOW_LOCAL_SEED: "true",
      ALLOW_DESTRUCTIVE_SEED: "true",
    }),
  );
});

test("fixture reset clears dependent scores before enrollments in one transaction", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../../prisma/seed.ts"),
    "utf8",
  );

  assert.match(source, /await prisma\.\$transaction\(async \(transaction\) =>/);
  assert.ok(
    source.indexOf("transaction.studentExamScore.deleteMany()") <
      source.indexOf("transaction.studentEnrollments.deleteMany()"),
  );
});
