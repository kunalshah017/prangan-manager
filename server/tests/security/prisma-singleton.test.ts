import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const serverRoot = testDirectory.includes(`${sep}dist${sep}`)
  ? join(testDirectory, "../../..")
  : join(testDirectory, "../..");
const runtimeDirectories = ["controllers", "service", "utils", "lib"];

const findTypeScriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );

  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return findTypeScriptFiles(path);
      return entry.isFile() && entry.name.endsWith(".ts") ? [path] : [];
    }),
  );

  return files.flat();
};

test("the runtime uses only the shared Prisma client constructor", async () => {
  const files = (
    await Promise.all(
      runtimeDirectories.map((directory) =>
        findTypeScriptFiles(join(serverRoot, directory)),
      ),
    )
  ).flat();

  const constructorLocations: string[] = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const constructors = source.match(/new\s+PrismaClient\s*\(/g) ?? [];
    constructorLocations.push(
      ...constructors.map(() => relative(serverRoot, file)),
    );
  }

  assert.deepEqual(constructorLocations.sort(), ["lib/prisma.ts"]);
});
