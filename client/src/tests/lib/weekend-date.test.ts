import { describe, expect, it } from "vitest";

import {
  getClosestWeekendWithinRange,
  getNearestWeekend,
  getWeekendOnOrAfter,
  getWeekendOnOrBefore,
  isWeekendDate,
} from "../../utils/helper";

describe("weekend-only attendance dates", () => {
  it("recognizes Saturday and Sunday using date-only UTC values", () => {
    expect(isWeekendDate("2026-04-25")).toBe(true);
    expect(isWeekendDate("2026-04-26")).toBe(true);
    expect(isWeekendDate("2026-04-27")).toBe(false);
  });

  it("keeps defaults on the closest weekend inside semester bounds", () => {
    expect(
      getClosestWeekendWithinRange("2026-04-30", "2025-07-01", "2026-04-30"),
    ).toBe("2026-04-26");
    expect(
      getClosestWeekendWithinRange("2025-07-01", "2025-07-01", "2026-04-30"),
    ).toBe("2025-07-05");
    expect(
      getClosestWeekendWithinRange("2026-04-25", "2025-07-01", "2026-04-30"),
    ).toBe("2026-04-25");
  });

  it("moves range boundaries inward to weekend dates", () => {
    expect(getWeekendOnOrAfter("2026-04-01", "2026-04-30")).toBe("2026-04-04");
    expect(getWeekendOnOrBefore("2026-04-30", "2026-04-01")).toBe("2026-04-26");
    expect(getWeekendOnOrAfter("2026-04-25", "2026-04-30")).toBe("2026-04-25");
    expect(getWeekendOnOrBefore("2026-04-26", "2026-04-01")).toBe("2026-04-26");
  });

  it("defaults to the next class day in India, wherever the viewer is", () => {
    // Friday 20:00 UTC is already Saturday 01:30 in India.
    expect(getNearestWeekend(new Date("2026-11-27T20:00:00.000Z"))).toBe("2026-11-28");
    // Sunday 19:00 UTC is Monday 00:30 in India: the next class day is Saturday.
    expect(getNearestWeekend(new Date("2026-11-29T19:00:00.000Z"))).toBe("2026-12-05");
    expect(getNearestWeekend(new Date("2026-11-29T10:00:00.000Z"))).toBe("2026-11-29");
  });
});
