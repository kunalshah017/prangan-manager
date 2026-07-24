import { describe, expect, it } from "vitest";

import { buildCsv, createCsvDownload } from "@/lib/csv-export";

describe("CSV export", () => {
  it("quotes commas, quotes, and newlines in report values", () => {
    expect(buildCsv([{ Name: 'Asha, "A"', Notes: "Line one\nLine two" }])).toBe(
      '\uFEFFName,Notes\r\n"Asha, ""A""","Line one\nLine two"\r\n',
    );
  });

  it("neutralizes spreadsheet formula prefixes in report values", () => {
    expect(buildCsv([{ Name: '=HYPERLINK("https://example.com")' }])).toBe(
      '\uFEFFName\r\n"\'=HYPERLINK(""https://example.com"")"\r\n',
    );
  });

  it("creates a CSV browser download with a CSV filename", () => {
    const download = createCsvDownload([{ Name: "Asha" }], "attendance");

    expect(download.filename).toBe("attendance.csv");
    expect(download.type).toBe("text/csv;charset=utf-8");
    expect(download.content).toContain("Name\r\nAsha\r\n");
  });
});