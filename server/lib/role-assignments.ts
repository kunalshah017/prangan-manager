// Ending an assignment always records when it ended. Assignments are never
// deleted: attendance and pay history keep pointing at them.
export const endedAssignmentData = () => ({
  isActive: false,
  endedAt: new Date(),
});

// Semester dates are calendar days; compare them with today's date in India.
export const indiaToday = (now: Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);

// A finished semester takes no new roles: it is archived or past its last day.
export const isSemesterFinished = (
  semester: { status: string; endDate: Date },
  today: string = indiaToday(),
) => semester.status === "ARCHIVED" || semester.endDate.toISOString().slice(0, 10) < today;

// Prisma filter for assignments that still grant access: those not tied to a
// semester, or tied to one that is neither archived nor past its last day.
// Ended semesters stay visible to admins only.
export const openSemesterAssignment = (today: string = indiaToday()) => ({
  OR: [
    { semesterId: null },
    {
      semester: {
        is: {
          status: { not: "ARCHIVED" as const },
          endDate: { gte: new Date(`${today}T00:00:00.000Z`) },
        },
      },
    },
  ],
});

// The opposite of an open semester: archived or past its last day. Used only
// to list past semesters; it never grants access.
export const finishedSemester = (today: string = indiaToday()) => ({
  OR: [
    { status: "ARCHIVED" as const },
    { endDate: { lt: new Date(`${today}T00:00:00.000Z`) } },
  ],
});

export const finishedSemesterMessage = (semesterName: string) =>
  `${semesterName} has finished. Assign a current semester instead.`;

// A user teaches one level per centre and semester. Two identical rows are a
// harmless duplicate; two different levels in the same place are not allowed.
export const findSecondEducatorLevel = (
  assignments: Array<{
    subRole: string;
    centerId?: string | null;
    semesterId?: string | null;
    semesterLevelId?: string | null;
  }>,
) => {
  const levelByPlace = new Map<string, string>();
  for (const assignment of assignments) {
    if (assignment.subRole !== "EDUCATOR" || !assignment.centerId || !assignment.semesterId) continue;
    const place = `${assignment.centerId}|${assignment.semesterId}`;
    const level = assignment.semesterLevelId ?? "";
    const existing = levelByPlace.get(place);
    if (existing !== undefined && existing !== level) return assignment;
    levelByPlace.set(place, level);
  }
  return null;
};

export const SECOND_EDUCATOR_LEVEL_MESSAGE =
  "A user can teach only one level per centre and semester. Keep one educator assignment there.";
