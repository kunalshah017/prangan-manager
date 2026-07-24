import { describe, expect, it } from "vitest";

import {
  getMissingStudentDetails,
  getStudentProfileCompletion,
} from "@/lib/student-profile";
import type { Student } from "@/types/api";

const student = (overrides: Partial<Student> = {}): Student => ({
  id: "student-1",
  name: "Asha Shah",
  firstName: "Asha",
  lastName: "Shah",
  profileImageUrl: "https://example.com/asha.jpg",
  dob: "2015-03-12T00:00:00.000Z",
  phoneNumber: "+919876543210",
  address: "Dombivli",
  schoolName: "Prangan School",
  fatherName: "Raj Shah",
  motherName: "Mira Shah",
  fatherOccupation: "Teacher",
  motherOccupation: "Engineer",
  familyIncome: "50000-75000",
  futureProfession: "Doctor",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  level: "LEVEL_2",
  ...overrides,
});

describe("student profile completeness", () => {
  it("returns no missing details for a complete student", () => {
    expect(getMissingStudentDetails(student())).toEqual([]);
    expect(getStudentProfileCompletion(student())).toBe(100);
  });

  it("uses one stable field list for missing details and completion", () => {
    const incomplete = student({
      profileImageUrl: "",
      schoolName: undefined,
      futureProfession: " ",
    });

    expect(getMissingStudentDetails(incomplete)).toEqual([
      "Profile image",
      "School",
      "Future profession",
    ]);
    expect(getStudentProfileCompletion(incomplete)).toBe(73);
  });
});
