import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const serverFile = (path: string) =>
  new URL(`../../${path}`, import.meta.url);

test("expense routes expose every authenticated ledger endpoint", async () => {
  const routes = await readFile(serverFile("routes/expense.routes.ts"), "utf8");

  for (const route of [
    '"/expenses"',
    '"/expenses/manual"',
    '"/expenses/:expenseId/void"',
    '"/expenses/remuneration-payments"',
  ]) {
    assert.match(routes, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.equal((routes.match(/preHandler:\s*authChecker/g) ?? []).length, 4);
});

test("expense routes are registered under the v1 API prefix", async () => {
  const server = await readFile(serverFile("server.ts"), "utf8");

  assert.match(server, /expenseRoutes/);
  assert.match(
    server,
    /fastify\.register\(expenseRoutes,\s*\{\s*prefix:\s*"\/api\/v1"\s*\}\)/,
  );
});
