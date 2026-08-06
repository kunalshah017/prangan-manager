import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { selectDefaultSemesterMonth } from "@/lib/remuneration";

describe("remuneration defaults", () => {
  it("selects the previous calendar month while it falls within the semester", () => {
    expect(
      selectDefaultSemesterMonth(
        "2026-07-01",
        "2027-04-30",
        new Date("2026-08-05T12:00:00Z"),
      ),
    ).toBe("2026-07");
  });

  it("renders each payee's profile picture", async () => {
    const source = await readFile(
      new URL("../../pages/attendance/Remuneration.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('import { ProfilePicture } from "@/components/ui"');
    expect(source).toContain("imageUrl={payee?.profileImageUrl ?? undefined}");
    expect(source).toContain('size="md"');
    expect(source).toContain("peer-checked:bg-primary");
  });
});
