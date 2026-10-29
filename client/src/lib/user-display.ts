import { levelName } from "@/lib/levels";
import type { User } from "@/types/api";

type Assignment = NonNullable<User["roleAssignments"]>[number];

export const SUB_ROLE_LABELS: Record<Assignment["subRole"], string> = {
  TRAINING_DEVELOPMENT: "Training and development",
  RECRUITMENT: "Recruitment",
  GROWTH_DEVELOPMENT: "Growth and development",
  CURRICULUM_MENTOR: "Curriculum mentor",
  TECH: "Tech",
  CENTER_MANAGER: "Centre manager",
  EDUCATOR: "Educator",
};

export const activeAssignments = (user: User) =>
  user.roleAssignments?.filter((assignment) => assignment.isActive) ?? [];

// "Educator, Level 2, Tulip" for the first active assignment, with a count of
// any others, so a row says what someone does without opening them.
export const assignmentSummary = (user: User, centreNames: Map<string, string>) => {
  const assignments = activeAssignments(user);
  const [first] = assignments;
  if (!first) return "No current assignment";
  const parts = [
    SUB_ROLE_LABELS[first.subRole],
    first.subRole === "EDUCATOR" && first.semesterLevel ? levelName(first.semesterLevel) : null,
    first.centerId ? centreNames.get(first.centerId) : null,
  ].filter(Boolean);
  const others = assignments.length - 1;
  return `${parts.join(", ")}${others > 0 ? ` and ${others} more` : ""}`;
};
