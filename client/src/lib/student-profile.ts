import type { Student } from "@/types/api";

// Each check passes when any of its fields is filled: one parent is enough, so
// a student with a single parent can still be complete. The "Complete student
// details" reminder uses the same checks (server/service/reminder.service.ts).
const profileChecks = [
  [["profileImageUrl"], "Profile image"],
  [["dob"], "Date of birth"],
  [["phoneNumber"], "Phone number"],
  [["address"], "Address"],
  [["schoolName"], "School"],
  [["fatherName", "motherName"], "Parent name"],
  [["fatherOccupation", "motherOccupation"], "Parent occupation"],
  [["familyIncome"], "Family income"],
  [["futureProfession"], "Future profession"],
] as const satisfies ReadonlyArray<readonly [ReadonlyArray<keyof Student>, string]>;

const hasValue = (value: Student[keyof Student]): boolean =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

export const getMissingStudentDetails = (student: Student): string[] =>
  profileChecks.flatMap(([fields, label]) =>
    fields.some((field) => hasValue(student[field])) ? [] : [label],
  );

export const getStudentProfileCompletion = (student: Student): number => {
  const completedChecks =
    profileChecks.length - getMissingStudentDetails(student).length;
  return Math.round((completedChecks / profileChecks.length) * 100);
};
