import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("all user and student fixtures use canonical person-name wrappers", async () => {
  const source = await readFile(
    new URL("../../prisma/seed.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /resolvePersonNameCreate/);
  assert.match(source, /const createFixtureUser/);
  assert.match(source, /const createFixtureStudent/);
  assert.equal(source.match(/prisma\.user\.create\(/g)?.length, 1);
  assert.equal(source.match(/prisma\.students\.create\(/g)?.length, 1);

  assert.equal(source.match(/createFixtureUser\(/g)?.length, 36);
  assert.equal(source.match(/createFixtureStudent\(/g)?.length, 6);
});
