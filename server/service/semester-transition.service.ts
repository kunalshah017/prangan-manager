import {
  AssessmentCycle,
  Level,
  SemesterStatus,
  SemesterTransitionStatus,
  SubRole,
  UserStatus,
  type Prisma,
} from "../generated/prisma/index.js";
import { buildSemesterActivationEmailJobs } from "../email/semester-activation-email.js";
import { composePersonName } from "../lib/person-name.js";
import { prisma } from "../lib/prisma.js";
import {
  selectLatestAssessment,
  suggestStudentProgression,
} from "../lib/student-promotion.js";
import type {
  StaffTransitionDecision,
  StudentTransitionDecision,
} from "../security/semester-transition-input.js";
import { enqueueEmail } from "./email-queue.service.js";

type Transaction = Prisma.TransactionClient;

export class SemesterTransitionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const payableRoles = new Set<SubRole>([
  SubRole.EDUCATOR,
  SubRole.CENTER_MANAGER,
]);

const loadTarget = (database: Transaction | typeof prisma, semesterId: string) =>
  database.semesters.findUnique({
    where: { id: semesterId },
    include: {
      center: { select: { id: true, projectId: true, name: true } },
      levels: {
        where: { isActive: true },
        include: { academicLevel: true },
        orderBy: { academicLevel: { journeyOrder: "asc" } },
      },
    },
  });

type PromotionEnrollment = {
  id: string;
  level: Level;
  semesterLevelId: string | null;
  semesterLevel: {
    academicLevel: {
      id: string;
      code: string;
      journeyOrder: number;
    };
  } | null;
};

type PromotionTargetLevel = {
  id: string;
  academicLevelId: string;
};

const loadPromotionSuggestions = async (
  database: Transaction | typeof prisma,
  sourceSemesterId: string,
  enrollments: readonly PromotionEnrollment[],
  targetSemesterLevels: readonly PromotionTargetLevel[],
) => {
  const [activeAcademicLevels, exams] = await Promise.all([
    database.academicLevel.findMany({
      where: { isActive: true },
      select: { id: true, code: true, journeyOrder: true },
      orderBy: { journeyOrder: "asc" },
    }),
    database.exam.findMany({
      where: {
        semesterId: sourceSemesterId,
        cycle: AssessmentCycle.PRE_ASSESSMENT,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        examDate: true,
        createdAt: true,
        totalMaxMarks: true,
        semesterLevelId: true,
        level: true,
        studentScores: {
          where: { enrollmentId: { in: enrollments.map((row) => row.id) } },
          select: {
            enrollmentId: true,
            totalScore: true,
            isAbsent: true,
          },
        },
      },
      orderBy: [{ examDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return new Map(
    enrollments.map((enrollment) => {
      const sourceAcademicLevel =
        enrollment.semesterLevel?.academicLevel ??
        activeAcademicLevels.find((level) => level.code === enrollment.level) ??
        null;
      const assessment = selectLatestAssessment(
        exams
          .filter(
            (candidate) =>
              (enrollment.semesterLevelId &&
                candidate.semesterLevelId === enrollment.semesterLevelId) ||
              candidate.level === enrollment.level,
          )
          .map((exam) => {
            const score =
              exam.studentScores.find(
                (candidate) => candidate.enrollmentId === enrollment.id,
              ) ?? null;
            return {
              examId: exam.id,
              examName: exam.name,
              examDate: exam.examDate,
              createdAt: exam.createdAt,
              totalScore: score ? Number(score.totalScore) : null,
              totalMaxMarks: exam.totalMaxMarks,
              isAbsent: score?.isAbsent ?? false,
            };
          }),
      );
      const suggestion = suggestStudentProgression({
        assessment,
        sourceAcademicLevel,
        activeAcademicLevels,
        targetSemesterLevels,
      });
      return [enrollment.id, suggestion] as const;
    }),
  );
};

export const initializeSemesterTransition = async (
  transaction: Transaction,
  {
    semesterId,
    sourceSemesterId,
    updatedBy,
  }: {
    semesterId: string;
    sourceSemesterId?: string;
    updatedBy: string;
  },
) => {
  const target = await loadTarget(transaction, semesterId);
  if (!target) throw new SemesterTransitionError("Semester not found.", 404);

  if (!sourceSemesterId) {
    return transaction.semesterTransition.create({
      data: { semesterId, updatedBy, studentPlan: [], staffPlan: [] },
    });
  }

  const source = await transaction.semesters.findUnique({
    where: { id: sourceSemesterId },
    include: { center: { select: { id: true } } },
  });
  if (!source) {
    throw new SemesterTransitionError("Previous semester not found.", 404);
  }
  if (source.centerId !== target.centerId || source.id === target.id) {
    throw new SemesterTransitionError(
      "Previous semester must be a different semester in the same center.",
      400,
    );
  }

  const [sourceEnrollments, sourceAssignments] = await Promise.all([
    transaction.studentEnrollments.findMany({
      where: { semesterId: sourceSemesterId, isActive: true },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        semesterLevel: { include: { academicLevel: true } },
      },
      orderBy: { student: { name: "asc" } },
    }),
    transaction.userRoleAssignments.findMany({
      where: { semesterId: sourceSemesterId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        },
        semesterLevel: { include: { academicLevel: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const targetByCode = new Map(
    target.levels.map((level) => [level.academicLevel.code, level]),
  );
  const promotionSuggestions = await loadPromotionSuggestions(
    transaction,
    sourceSemesterId,
    sourceEnrollments,
    target.levels,
  );
  const studentPlan: StudentTransitionDecision[] = sourceEnrollments.map(
    (enrollment) => {
      const suggestion = promotionSuggestions.get(enrollment.id)!;
      return {
        sourceEnrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        decision: suggestion.decision,
        ...(suggestion.targetSemesterLevelId && {
          targetSemesterLevelId: suggestion.targetSemesterLevelId,
        }),
      };
    },
  );

  const assignmentsByUser = new Map<string, typeof sourceAssignments>();
  for (const assignment of sourceAssignments) {
    const current = assignmentsByUser.get(assignment.userId) ?? [];
    current.push(assignment);
    assignmentsByUser.set(assignment.userId, current);
  }
  const userIds = [...assignmentsByUser.keys()];
  const previousRates = userIds.length
    ? await transaction.semesterRemunerationRate.findMany({
        where: { userId: { in: userIds }, semesterId: sourceSemesterId },
      })
    : [];
  const rateByUser = new Map(
    previousRates.map((rate) => [rate.userId, Number(rate.dailyRate)]),
  );

  const staffPlan = [...assignmentsByUser.entries()].map(
    ([userId, assignments]) => {
      const targetAssignments = assignments.map((assignment) => {
        const targetLevel = assignment.semesterLevel?.academicLevel.code
          ? targetByCode.get(assignment.semesterLevel.academicLevel.code)
          : undefined;
        return {
          subRole: assignment.subRole,
          projectId: target.center.projectId,
          centerId: target.centerId,
          semesterId: target.id,
          ...(assignment.subRole === SubRole.EDUCATOR &&
            targetLevel && {
              semesterLevelId: targetLevel.id,
              level: targetLevel.academicLevel.code as Level,
            }),
          ...(assignment.committedDays && {
            committedDays: assignment.committedDays,
          }),
        };
      });
      const payable = targetAssignments.some((assignment) =>
        payableRoles.has(assignment.subRole),
      );
      return {
        userId,
        decision: "ASSIGN" as const,
        assignments: targetAssignments,
        ...(payable && { dailyRate: rateByUser.get(userId) ?? null }),
      };
    },
  );

  return transaction.semesterTransition.create({
    data: {
      semesterId,
      sourceSemesterId,
      updatedBy,
      studentPlan,
      staffPlan,
    },
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasStableId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;

const isRecognizableStudent = (
  value: unknown,
): value is Record<string, unknown> =>
  isRecord(value) &&
  hasStableId(value.sourceEnrollmentId) &&
  hasStableId(value.studentId);

const isResolvedStudent = (value: Record<string, unknown>) =>
  value.decision === "NOT_CONTINUING" || value.decision === "PASSED_OUT"
    ? !hasStableId(value.targetSemesterLevelId)
    : (value.decision === "PROMOTE" || value.decision === "RETAIN") &&
      hasStableId(value.targetSemesterLevelId);

const isValidAssignment = (value: unknown) => {
  if (
    !isRecord(value) ||
    !Object.values(SubRole).includes(value.subRole as SubRole) ||
    !hasStableId(value.projectId) ||
    !hasStableId(value.centerId) ||
    !hasStableId(value.semesterId)
  ) {
    return false;
  }
  return value.subRole === SubRole.EDUCATOR
    ? hasStableId(value.semesterLevelId)
    : !hasStableId(value.semesterLevelId);
};

const validAssignedStaff = (value: Record<string, unknown>) => {
  if (
    value.decision !== "ASSIGN" ||
    !Array.isArray(value.assignments) ||
    value.assignments.length === 0 ||
    !value.assignments.every(isValidAssignment)
  ) {
    return null;
  }
  return value.assignments as Array<{ subRole: SubRole }>;
};

const getProgress = (students: unknown[], staff: unknown[]) => {
  const recognizableStudents = students.filter(isRecognizableStudent);
  const recognizableStaff = staff.filter(
    (value): value is Record<string, unknown> =>
      isRecord(value) && hasStableId(value.userId),
  );
  const assignedStaff = recognizableStaff
    .map((decision) => ({ decision, assignments: validAssignedStaff(decision) }))
    .filter(
      (
        row,
      ): row is {
        decision: Record<string, unknown>;
        assignments: Array<{ subRole: SubRole }>;
      } => row.assignments !== null,
    );
  const payableStaff = assignedStaff.filter((row) =>
    row.assignments.some((assignment) =>
      payableRoles.has(assignment.subRole),
    ),
  );

  return {
    students: {
      resolved: recognizableStudents.filter(isResolvedStudent).length,
      total: recognizableStudents.length,
    },
    staff: {
      resolved:
        assignedStaff.length +
        recognizableStaff.filter(
          (decision) =>
            decision.decision === "NOT_CONTINUING" &&
            Array.isArray(decision.assignments) &&
            decision.assignments.length === 0,
        ).length,
      total: recognizableStaff.length,
    },
    rates: {
      resolved: payableStaff.filter(
        ({ decision }) =>
          typeof decision.dailyRate === "number" &&
          Number.isFinite(decision.dailyRate) &&
          decision.dailyRate >= 0,
      ).length,
      total: payableStaff.length,
    },
  };
};

type SemesterTransitionSummaryRecord = {
  updatedAt: Date;
  studentPlan: unknown;
  staffPlan: unknown;
  semester: {
    id: string;
    name: string;
    status: SemesterStatus;
    startDate: Date;
    endDate: Date;
  };
  sourceSemester: {
    id: string;
    name: string;
  } | null;
};

export const summarizeSemesterTransition = (
  transition: SemesterTransitionSummaryRecord,
) => {
  const students = Array.isArray(transition.studentPlan)
    ? (transition.studentPlan as StudentTransitionDecision[])
    : [];
  const staff = Array.isArray(transition.staffPlan)
    ? (transition.staffPlan as StaffTransitionDecision[])
    : [];

  return {
    semester: transition.semester,
    updatedAt: transition.updatedAt,
    sourceSemester: transition.sourceSemester,
    progress: getProgress(students, staff),
  };
};

export const getSemesterTransition = async (semesterId: string) => {
  const transition = await prisma.semesterTransition.findUnique({
    where: { semesterId },
    include: {
      semester: {
        include: {
          center: { select: { id: true, name: true, projectId: true } },
          levels: {
            where: { isActive: true },
            include: { academicLevel: true },
            orderBy: { academicLevel: { journeyOrder: "asc" } },
          },
        },
      },
      sourceSemester: { select: { id: true, name: true } },
    },
  });
  if (!transition)
    throw new SemesterTransitionError("Semester setup not found.", 404);

  const students = transition.studentPlan as StudentTransitionDecision[];
  const staff = transition.staffPlan as StaffTransitionDecision[];
  const [studentRows, userRows] = await Promise.all([
    prisma.studentEnrollments.findMany({
      where: { id: { in: students.map((item) => item.sourceEnrollmentId) } },
      include: {
        student: true,
        semesterLevel: { include: { academicLevel: true } },
      },
    }),
    prisma.user.findMany({
      where: { id: { in: staff.map((item) => item.userId) } },
      select: {
        id: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    }),
  ]);
  const enrollmentById = new Map(studentRows.map((row) => [row.id, row]));
  const userById = new Map(userRows.map((row) => [row.id, row]));
  const promotionSuggestions = transition.sourceSemesterId
    ? await loadPromotionSuggestions(
        prisma,
        transition.sourceSemesterId,
        studentRows,
        transition.semester.levels,
      )
    : new Map();

  return {
    ...transition,
    studentPlan: students.map((decision) => ({
      ...decision,
      student: enrollmentById.get(decision.sourceEnrollmentId)?.student,
      sourceLevel:
        enrollmentById.get(decision.sourceEnrollmentId)?.semesterLevel
          ?.academicLevel ?? null,
      promotionSuggestion: promotionSuggestions.get(
        decision.sourceEnrollmentId,
      ),
    })),
    staffPlan: staff.map((decision) => ({
      ...decision,
      user: userById.get(decision.userId) ?? null,
    })),
    progress: getProgress(students, staff),
  };
};

const requireDraftTransition = async (semesterId: string) => {
  const transition = await prisma.semesterTransition.findUnique({
    where: { semesterId },
    include: {
      semester: {
        include: {
          center: { select: { projectId: true } },
          levels: { where: { isActive: true } },
        },
      },
      sourceSemester: true,
    },
  });
  if (!transition)
    throw new SemesterTransitionError("Semester setup not found.", 404);
  if (transition.status !== SemesterTransitionStatus.DRAFT) {
    throw new SemesterTransitionError(
      "This semester setup is already complete.",
      409,
    );
  }
  return transition;
};

export const saveStudentTransitionPlan = async (
  semesterId: string,
  decisions: StudentTransitionDecision[],
  updatedBy: string,
) => {
  const transition = await requireDraftTransition(semesterId);
  const sourceIds = transition.sourceSemesterId
    ? new Set(
        (
          await prisma.studentEnrollments.findMany({
            where: {
              semesterId: transition.sourceSemesterId,
              isActive: true,
            },
            select: { id: true, studentId: true },
          })
        ).map((row) => `${row.id}:${row.studentId}`),
      )
    : new Set<string>();
  const targetLevelIds = new Set(
    transition.semester.levels.map((level) => level.id),
  );
  if (
    decisions.some(
      (decision) =>
        !sourceIds.has(
          `${decision.sourceEnrollmentId}:${decision.studentId}`,
        ) ||
        (decision.targetSemesterLevelId &&
          !targetLevelIds.has(decision.targetSemesterLevelId)),
    )
  ) {
    throw new SemesterTransitionError(
      "Student decisions do not belong to this semester transition.",
      400,
    );
  }
  await prisma.semesterTransition.update({
    where: { semesterId },
    data: { studentPlan: decisions as unknown as Prisma.InputJsonValue, updatedBy },
  });
  return getSemesterTransition(semesterId);
};

export const saveStaffTransitionPlan = async (
  semesterId: string,
  decisions: StaffTransitionDecision[],
  updatedBy: string,
) => {
  const transition = await requireDraftTransition(semesterId);
  const targetLevelIds = new Set(
    transition.semester.levels.map((level) => level.id),
  );
  const userCount = await prisma.user.count({
    where: {
      id: { in: decisions.map((decision) => decision.userId) },
      status: UserStatus.APPROVED,
    },
  });
  if (userCount !== decisions.length) {
    throw new SemesterTransitionError(
      "Every selected staff member must be an approved user.",
      400,
    );
  }
  for (const decision of decisions) {
    for (const assignment of decision.assignments) {
      if (
        assignment.projectId !== transition.semester.center.projectId ||
        assignment.centerId !== transition.semester.centerId ||
        assignment.semesterId !== transition.semesterId ||
        (assignment.semesterLevelId &&
          !targetLevelIds.has(assignment.semesterLevelId))
      ) {
        throw new SemesterTransitionError(
          "Staff assignments must use the target semester scope.",
          400,
        );
      }
    }
  }
  await prisma.semesterTransition.update({
    where: { semesterId },
    data: { staffPlan: decisions as unknown as Prisma.InputJsonValue, updatedBy },
  });
  return getSemesterTransition(semesterId);
};

export const activateSemesterTransition = async (
  semesterId: string,
  updatedBy: string,
) =>
  prisma.$transaction(async (transaction) => {
    const transition = await transaction.semesterTransition.findUnique({
      where: { semesterId },
      include: {
        semester: {
          include: {
            center: { select: { projectId: true, name: true } },
            levels: {
              where: { isActive: true },
              include: { academicLevel: true },
            },
          },
        },
      },
    });
    if (!transition)
      throw new SemesterTransitionError("Semester setup not found.", 404);
    if (transition.status === SemesterTransitionStatus.COMPLETED) {
      return { semester: transition.semester, queuedEmailCount: 0 };
    }

    const students = transition.studentPlan as StudentTransitionDecision[];
    const staff = transition.staffPlan as StaffTransitionDecision[];
    const sourceStudentCount = transition.sourceSemesterId
      ? await transaction.studentEnrollments.count({
          where: {
            semesterId: transition.sourceSemesterId,
            isActive: true,
          },
        })
      : 0;
    const sourceStaff = transition.sourceSemesterId
      ? await transaction.userRoleAssignments.findMany({
          where: {
            semesterId: transition.sourceSemesterId,
            isActive: true,
          },
          distinct: ["userId"],
          select: { userId: true },
        })
      : [];
    const plannedStaffIds = new Set(staff.map((decision) => decision.userId));
    const progress = getProgress(students, staff);
    if (
      students.length !== sourceStudentCount ||
      sourceStaff.some((row) => !plannedStaffIds.has(row.userId)) ||
      progress.students.resolved !== progress.students.total ||
      progress.staff.resolved !== progress.staff.total ||
      progress.rates.resolved !== progress.rates.total
    ) {
      throw new SemesterTransitionError(
        "Semester setup is incomplete.",
        409,
        progress,
      );
    }

    const targetLevelById = new Map(
      transition.semester.levels.map((level) => [level.id, level]),
    );
    for (const decision of students) {
      if (
        decision.decision === "NOT_CONTINUING" ||
        decision.decision === "PASSED_OUT"
      ) {
        continue;
      }
      const targetLevel = decision.targetSemesterLevelId
        ? targetLevelById.get(decision.targetSemesterLevelId)
        : undefined;
      if (!targetLevel)
        throw new SemesterTransitionError(
          "A student target level is no longer available.",
          409,
        );
      await transaction.studentEnrollments.upsert({
        where: {
          studentId_semesterId: {
            studentId: decision.studentId,
            semesterId,
          },
        },
        create: {
          studentId: decision.studentId,
          projectId: transition.semester.center.projectId,
          centerId: transition.semester.centerId,
          semesterId,
          semesterLevelId: targetLevel.id,
          level: targetLevel.academicLevel.code as Level,
          isActive: true,
          ...(decision.decision === "PROMOTE" && { promotedAt: new Date() }),
        },
        update: {
          semesterLevelId: targetLevel.id,
          level: targetLevel.academicLevel.code as Level,
          isActive: true,
        },
      });
    }

    for (const decision of staff) {
      if (decision.decision === "NOT_CONTINUING") continue;
      for (const assignment of decision.assignments) {
        const targetLevel = assignment.semesterLevelId
          ? targetLevelById.get(assignment.semesterLevelId)
          : undefined;
        if (assignment.subRole === SubRole.EDUCATOR && !targetLevel) {
          throw new SemesterTransitionError(
            "Every educator requires an available target level.",
            409,
          );
        }
        await transaction.userRoleAssignments.create({
          data: {
            userId: decision.userId,
            subRole: assignment.subRole,
            projectId: transition.semester.center.projectId,
            centerId: transition.semester.centerId,
            semesterId,
            semesterLevelId:
              assignment.subRole === SubRole.EDUCATOR
                ? targetLevel?.id
                : null,
            level:
              assignment.subRole === SubRole.EDUCATOR
                ? (targetLevel?.academicLevel.code as Level | undefined)
                : null,
            committedDays: assignment.committedDays,
            isActive: true,
          },
        });
      }
      if (
        decision.assignments.some((assignment) =>
          payableRoles.has(assignment.subRole),
        )
      ) {
        await transaction.semesterRemunerationRate.upsert({
          where: {
            userId_semesterId: { userId: decision.userId, semesterId },
          },
          create: {
            userId: decision.userId,
            semesterId,
            dailyRate: decision.dailyRate!,
          },
          update: { dailyRate: decision.dailyRate! },
        });
        await transaction.semesterRemunerationPeriod.upsert({
          where: {
            userId_semesterId_effectiveFrom: {
              userId: decision.userId,
              semesterId,
              effectiveFrom: transition.semester.startDate,
            },
          },
          create: {
            userId: decision.userId,
            semesterId,
            amountPerDay: decision.dailyRate!,
            effectiveFrom: transition.semester.startDate,
            createdBy: updatedBy,
            updatedBy,
          },
          update: {
            amountPerDay: decision.dailyRate!,
            updatedBy,
          },
        });
      }
    }

    const staffUsers = staff.length
      ? await transaction.user.findMany({
          where: {
            id: { in: staff.map((decision) => decision.userId) },
            status: UserStatus.APPROVED,
          },
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        })
      : [];
    if (staffUsers.length !== staff.length) {
      throw new SemesterTransitionError(
        "A staff member is no longer approved for assignment.",
        409,
      );
    }
    const staffUserById = new Map(staffUsers.map((user) => [user.id, user]));
    const emailJobs = buildSemesterActivationEmailJobs({
      semesterId,
      semesterName: transition.semester.name,
      centerName: transition.semester.center.name,
      users: staff.map((decision) => {
        const user = staffUserById.get(decision.userId)!;
        return {
          userId: user.id,
          email: user.email,
          name: user.firstName
            ? composePersonName({
                firstName: user.firstName,
                middleName: user.middleName,
                lastName: user.lastName,
              })
            : user.name,
          decision: decision.decision,
          assignments: decision.assignments.map((assignment) => ({
            subRole: assignment.subRole,
            ...(assignment.semesterLevelId && {
              levelName:
                targetLevelById.get(assignment.semesterLevelId)?.academicLevel
                  .name,
            }),
            ...(assignment.committedDays && {
              committedDays: assignment.committedDays,
            }),
          })),
          dailyRate:
            typeof decision.dailyRate === "number"
              ? decision.dailyRate
              : null,
        };
      }),
    });
    for (const emailJob of emailJobs) {
      await enqueueEmail(emailJob, transaction);
    }

    const semester = await transaction.semesters.update({
      where: { id: semesterId },
      data: { status: SemesterStatus.ACTIVE },
    });
    await transaction.semesterTransition.update({
      where: { semesterId },
      data: {
        status: SemesterTransitionStatus.COMPLETED,
        updatedBy,
      },
    });
    return { semester, queuedEmailCount: emailJobs.length };
  });

export const getCenterSemesterTransitionSummaries = async (
  centerId: string,
) => {
  const center = await prisma.centers.findUnique({
    where: { id: centerId },
    select: { id: true },
  });
  if (!center) throw new SemesterTransitionError("Center not found.", 404);

  const transitions = await prisma.semesterTransition.findMany({
    where: {
      status: SemesterTransitionStatus.DRAFT,
      semester: {
        centerId: center.id,
        status: SemesterStatus.DRAFT,
      },
    },
    select: {
      updatedAt: true,
      studentPlan: true,
      staffPlan: true,
      semester: {
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      },
      sourceSemester: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return transitions.map(summarizeSemesterTransition);
};
