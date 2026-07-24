import type { Student } from "@/types/api";

const profileFields = [
  ["profileImageUrl", "Profile image"],
  ["dob", "Date of birth"],
  ["phoneNumber", "Phone number"],
  ["address", "Address"],
  ["schoolName", "School"],
  ["fatherName", "Father name"],
  ["motherName", "Mother name"],
  ["fatherOccupation", "Father occupation"],
  ["motherOccupation", "Mother occupation"],
  ["familyIncome", "Family income"],
  ["futureProfession", "Future profession"],
] as const satisfies ReadonlyArray<readonly [keyof Student, string]>;

const hasValue = (value: Student[keyof Student]): boolean =>
  typeof value === "string" ? value.trim().length > 0 : Boolean(value);

export const getMissingStudentDetails = (student: Student): string[] =>
  profileFields.flatMap(([field, label]) =>
    hasValue(student[field]) ? [] : [label],
  );

export const getStudentProfileCompletion = (student: Student): number => {
  const completedFields =
    profileFields.length - getMissingStudentDetails(student).length;
  return Math.round((completedFields / profileFields.length) * 100);
};
