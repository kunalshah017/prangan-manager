import { describe, expect, it } from "vitest";

import { getStaffAttendancePdfFilename } from "@/lib/staff-attendance-pdf-export";

describe("staff attendance PDF export", () => {
  it("creates a contextual PDF filename without unsafe punctuation", () => {
    expect(
      getStaffAttendancePdfFilename({
        projectName: "Prangan / Mumbai",
        centerName: "Tulip & Lavender",
        periodLabel: "04 Jul 2026 to 26 Jul 2026",
      }),
    ).toBe("Staff_Attendance_Prangan_Mumbai_Tulip_Lavender_04_Jul_2026_to_26_Jul_2026.pdf");
  });
});
