import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Vite React runtime resolution", () => {
  it("deduplicates React and router runtime modules", async () => {
    const source = await readFile(
      new URL("../../../vite.config.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain(
      'dedupe: ["react", "react-dom", "react-router-dom"]',
    );
  });
});
