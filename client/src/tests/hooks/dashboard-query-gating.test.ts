import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("dashboard query gating", () => {
  it("lets context staff requests be disabled by dashboard permissions", async () => {
    const source = await readFile(
      new URL("../../hooks/useUserQueries.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("enabled = true");
    expect(source).toContain(
      "Boolean(projectId && centerId && semesterId && enabled)",
    );
  });

  it("lets staff attendance requests be disabled by dashboard permissions", async () => {
    const source = await readFile(
      new URL("../../hooks/useAttendanceQueries.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("enabled?: boolean;");
    expect(source).toContain("enabled: params.enabled ?? true");
  });

  it("lets syllabus statistics requests be disabled by dashboard permissions", async () => {
    const source = await readFile(
      new URL("../../hooks/useSyllabusQueries.ts", import.meta.url),
      "utf8",
    );
    const statistics = source.slice(
      source.indexOf("export const useSyllabusStatistics"),
    );

    expect(statistics).toContain("enabled?: boolean;");
    expect(statistics).toContain("enabled: filters?.enabled ?? true");
  });
});
