import { describe, expect, it } from "vitest";

import {
  getClosestWeekendWithinRange,
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
});
