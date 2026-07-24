import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const serverRoot = resolve(import.meta.dirname, "../..");
const workspaceRoot = resolve(serverRoot, "..");

const readSource = (path: string) => readFileSync(path, "utf8");

test("server exposes explicit local fixtures and no Vercel server deployment path", () => {
  const packageJson = JSON.parse(
    readSource(resolve(serverRoot, "package.json")),
  ) as { scripts: Record<string, string>; prisma?: unknown };
  const serverSource = readSource(resolve(serverRoot, "server.ts"));
  const workflowSource = readSource(
    resolve(workspaceRoot, ".github/workflows/main_prangan-manager-api.yml"),
  );

  assert.equal(packageJson.scripts.seed, undefined);
  assert.equal(packageJson.scripts["db:seed:prod"], undefined);
  assert.equal(packageJson.scripts["vercel-build"], undefined);
  assert.equal(packageJson.prisma, undefined);
  assert.equal(packageJson.scripts["db:reset:fixtures"], "tsx prisma/seed.ts");
  assert.equal(
    packageJson.scripts["db:seed:syllabus"],
    "tsx prisma/seed-syllabus.ts",
  );
  assert.equal(existsSync(resolve(serverRoot, "api/index.ts")), false);
  assert.equal(existsSync(resolve(serverRoot, "vercel.json")), false);
  assert.doesNotMatch(serverSource, /process\.env\.VERCEL/);
  assert.match(workflowSource, /npm ci/);
  assert.doesNotMatch(workflowSource, /npm install/);
  assert.doesNotMatch(workflowSource, /prisma migrate deploy/);
});
