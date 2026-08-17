import { CommittedDays, SubRole } from "../generated/prisma/index.js";

export type StudentTransitionDecision = {
  sourceEnrollmentId: string;
  studentId: string;
  decision:
    | "REVIEW"
    | "PROMOTE"
    | "RETAIN"
    | "PASSED_OUT"
    | "NOT_CONTINUING";
  targetSemesterLevelId?: string;
};

export type TransitionAssignment = {
  subRole: SubRole;
  projectId: string;
  centerId: string;
  semesterId: string;
  semesterLevelId?: string;
  committedDays?: CommittedDays;
};

export type StaffTransitionDecision = {
  userId: string;
  decision: "ASSIGN" | "NOT_CONTINUING";
  assignments: TransitionAssignment[];
  dailyRate?: number;
};

type ParseResult<T> = { data: T } | { error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const hasOnlyKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
) => Object.keys(value).every((key) => allowed.includes(key));

export const parseStudentTransitionPlan = (
  input: unknown,
): ParseResult<StudentTransitionDecision[]> => {
  if (!Array.isArray(input)) return { error: "Student plan must be an array." };

  const data: StudentTransitionDecision[] = [];
  const studentIds = new Set<string>();
  const enrollmentIds = new Set<string>();
  for (const [index, raw] of input.entries()) {
    if (
      !isRecord(raw) ||
      !hasOnlyKeys(raw, [
        "sourceEnrollmentId",
        "studentId",
        "decision",
        "targetSemesterLevelId",
      ])
    ) {
      return { error: `Student decision ${index + 1} is invalid.` };
    }
    const sourceEnrollmentId = nonEmptyString(raw.sourceEnrollmentId);
    const studentId = nonEmptyString(raw.studentId);
    const decision = raw.decision;
    if (
      !sourceEnrollmentId ||
      !studentId ||
      ![
        "REVIEW",
        "PROMOTE",
        "RETAIN",
        "PASSED_OUT",
        "NOT_CONTINUING",
      ].includes(String(decision))
    ) {
      return { error: `Student decision ${index + 1} is incomplete.` };
    }
    if (studentIds.has(studentId) || enrollmentIds.has(sourceEnrollmentId)) {
      return { error: "Each source student may appear only once." };
    }
    const targetSemesterLevelId = nonEmptyString(raw.targetSemesterLevelId);
    if (
      (decision === "PROMOTE" || decision === "RETAIN") &&
      !targetSemesterLevelId
    ) {
      return {
        error: `Student decision ${index + 1} requires a target level.`,
      };
    }
    if (
      ["REVIEW", "PASSED_OUT", "NOT_CONTINUING"].includes(String(decision)) &&
      targetSemesterLevelId
    ) {
      return {
        error: `Student decision ${index + 1} cannot include a target level.`,
      };
    }

    studentIds.add(studentId);
    enrollmentIds.add(sourceEnrollmentId);
    data.push({
      sourceEnrollmentId,
      studentId,
      decision: decision as StudentTransitionDecision["decision"],
      ...(targetSemesterLevelId && { targetSemesterLevelId }),
    });
  }
  return { data };
};

const parseAssignment = (
  input: unknown,
  index: number,
): ParseResult<TransitionAssignment> => {
  if (
    !isRecord(input) ||
    !hasOnlyKeys(input, [
      "subRole",
      "projectId",
      "centerId",
      "semesterId",
      "semesterLevelId",
      "committedDays",
    ])
  ) {
    return { error: `Assignment ${index + 1} is invalid.` };
  }
  const subRole = input.subRole;
  const projectId = nonEmptyString(input.projectId);
  const centerId = nonEmptyString(input.centerId);
  const semesterId = nonEmptyString(input.semesterId);
  if (
    !Object.values(SubRole).includes(subRole as SubRole) ||
    !projectId ||
    !centerId ||
    !semesterId
  ) {
    return { error: `Assignment ${index + 1} is incomplete.` };
  }

  const semesterLevelId = nonEmptyString(input.semesterLevelId);
  const committedDays = input.committedDays;
  if (subRole === SubRole.EDUCATOR && !semesterLevelId) {
    return { error: "Every educator assignment requires a semester level." };
  }
  if (
    semesterLevelId &&
    subRole !== SubRole.EDUCATOR
  ) {
    return { error: "Only educators can have a semester level." };
  }
  if (
    committedDays !== undefined &&
    !Object.values(CommittedDays).includes(committedDays as CommittedDays)
  ) {
    return { error: `Assignment ${index + 1} has invalid committed days.` };
  }
  if (
    committedDays !== undefined &&
    subRole !== SubRole.EDUCATOR &&
    subRole !== SubRole.CENTER_MANAGER
  ) {
    return {
      error: "Only educators and center managers can have committed days.",
    };
  }

  return {
    data: {
      subRole: subRole as SubRole,
      projectId,
      centerId,
      semesterId,
      ...(semesterLevelId && { semesterLevelId }),
      ...(committedDays !== undefined && {
        committedDays: committedDays as CommittedDays,
      }),
    },
  };
};

export const parseStaffTransitionPlan = (
  input: unknown,
): ParseResult<StaffTransitionDecision[]> => {
  if (!Array.isArray(input)) return { error: "Staff plan must be an array." };

  const data: StaffTransitionDecision[] = [];
  const userIds = new Set<string>();
  for (const [index, raw] of input.entries()) {
    if (
      !isRecord(raw) ||
      !hasOnlyKeys(raw, ["userId", "decision", "assignments", "dailyRate"])
    ) {
      return { error: `Staff decision ${index + 1} is invalid.` };
    }
    const userId = nonEmptyString(raw.userId);
    const decision = raw.decision;
    if (
      !userId ||
      !["ASSIGN", "NOT_CONTINUING"].includes(String(decision)) ||
      userIds.has(userId)
    ) {
      return { error: `Staff decision ${index + 1} is incomplete or duplicated.` };
    }

    const rawAssignments = raw.assignments ?? [];
    if (!Array.isArray(rawAssignments)) {
      return { error: `Staff decision ${index + 1} assignments must be an array.` };
    }
    const assignments: TransitionAssignment[] = [];
    const assignmentKeys = new Set<string>();
    for (const [assignmentIndex, assignment] of rawAssignments.entries()) {
      const parsed = parseAssignment(assignment, assignmentIndex);
      if ("error" in parsed) return parsed;
      const key = `${parsed.data.subRole}:${parsed.data.semesterLevelId ?? ""}`;
      if (assignmentKeys.has(key)) {
        return {
          error: `Staff decision ${index + 1} contains a duplicate assignment.`,
        };
      }
      assignmentKeys.add(key);
      assignments.push(parsed.data);
    }
    if (decision === "ASSIGN" && assignments.length === 0) {
      return { error: `Staff decision ${index + 1} requires an assignment.` };
    }
    if (decision === "NOT_CONTINUING" && assignments.length > 0) {
      return { error: `Departing staff cannot have target assignments.` };
    }

    const payable = assignments.some(
      (assignment) =>
        assignment.subRole === SubRole.EDUCATOR ||
        assignment.subRole === SubRole.CENTER_MANAGER,
    );
    const dailyRate =
      typeof raw.dailyRate === "number" ? raw.dailyRate : undefined;
    if (
      dailyRate !== undefined &&
      (!Number.isFinite(dailyRate) ||
        dailyRate < 0 ||
        Math.round(dailyRate * 100) !== dailyRate * 100)
    ) {
      return { error: `Staff decision ${index + 1} has an invalid daily rate.` };
    }
    if (payable && dailyRate === undefined) {
      return { error: `Staff decision ${index + 1} requires a daily rate.` };
    }

    userIds.add(userId);
    data.push({
      userId,
      decision: decision as StaffTransitionDecision["decision"],
      assignments,
      ...(dailyRate !== undefined && { dailyRate }),
    });
  }
  return { data };
};
