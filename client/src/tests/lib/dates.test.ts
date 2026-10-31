import { describe, expect, it } from "vitest";

import { calendarDay, formatCalendarDate, indiaToday } from "@/lib/dates";

describe("calendar days and today", () => {
  it("shows a stored day as that day for every viewer", () => {
    // The API sends days as UTC midnights; a California browser must not show 29 Nov.
    expect(formatCalendarDate("2026-11-30T00:00:00.000Z")).toBe("30 Nov 2026");
    expect(formatCalendarDate("2026-11-30")).toBe("30 Nov 2026");
    expect(calendarDay("2026-11-30T00:00:00.000Z")).toBe("2026-11-30");
  });

  it("takes today from India, where the centres are", () => {
    expect(indiaToday(new Date("2026-11-27T18:29:59.999Z"))).toBe("2026-11-27");
    expect(indiaToday(new Date("2026-11-27T18:30:00.000Z"))).toBe("2026-11-28");
  });
});
