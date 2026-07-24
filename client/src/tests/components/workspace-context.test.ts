import { describe, expect, it } from "vitest";

import { readFile } from "node:fs/promises";

describe("workspace context", () => {
  it("derives project, center, and semester from route params", async () => {
    const source = await readFile(
      new URL("../../components/WorkspaceContext.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("useParams");
    expect(source).toContain("projectId");
    expect(source).toContain("centerId");
    expect(source).toContain("semesterId");
  });
});
