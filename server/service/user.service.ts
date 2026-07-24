import {
  UserStatus,
  Level,
  Role,
  SubRole,
  Prisma,
  CommittedDays,
} from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import {
  adminUserDetailSelect,
  adminUserSelect,
  contextStaffSelect,
  currentUserSelect,
  remunerationUserSelect,
} from "../security/user-selects.js";
import { AcademicLevelServiceError } from "./academic-level.service.js";
import { resolveSemesterLevelInput } from "./semester-level.service.js";
import { validateRemunerationPeriods } from "../lib/remuneration-periods.js";

export const createUser = async (userData: any) => {
  try {
    const user = await prisma.user.create({
      data: userData,
    });
    return user;
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    return "Failed to create user";
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user;
  } catch (error: unknown) {
    console.error("Error fetching user by email:", error);
    return "Failed to fetch user";
  }
};

export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: currentUserSelect,
    });
    return user;
  } catch (error: unknown) {
    console.error("Error fetching user by ID:", error);
    return "Failed to fetch user";
  }
};

export const getAdminUserById = async (id: string) => {
  try {
    return await prisma.user.findUnique({
      where: { id },
      select: adminUserDetailSelect,
    });
  } catch (error: unknown) {
    console.error("Error fetching admin user detail:", error);
    return "Failed to fetch user";
  }
};

export const getRemunerationUsers = async ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
}) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            status: UserStatus.APPROVED,
            roleAssignments: {
              some: {
                isActive: true,
                subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
                projectId,
                centerId,
                semesterId,
              },
            },
          },
          {
            attendance: {
              some: {
                projectId,
                centerId,
                semesterId,
                roleAssignment: {
                  subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
                },
              },
            },
          },
        ],
      },
      select: remunerationUserSelect(semesterId),
      orderBy: { name: "asc" },
    });
    return users.map(({ remunerationRates, remunerationPeriods, ...user }) => ({
      ...user,
      remunerationPeriods: remunerationPeriods.map((period) => ({
        ...period,
        amountPerDay: Number(period.amountPerDay),
        effectiveFrom: period.effectiveFrom.toISOString().slice(0, 10),
        effectiveTo: period.effectiveTo?.toISOString().slice(0, 10) ?? null,
      })),
      dailyRate:
        remunerationPeriods.length > 0
          ? Number(remunerationPeriods[remunerationPeriods.length - 1].amountPerDay)
          : remunerationRates.length > 0
          ? Number(remunerationRates[0].dailyRate)
          : null,
    }));
  } catch (error: unknown) {
    console.error("Error fetching remuneration users:", error);
    return "Failed to fetch remuneration users";
  }
};

const previousUtcDate = (date: string) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value;
};

export const setSemesterRemunerationPeriod = async ({
  projectId,
  centerId,
  semesterId,
  userId,
  amountPerDay,
  effectiveFrom,
  actorId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
  userId: string;
  amountPerDay: number;
  effectiveFrom: string;
  actorId: string;
}) => {
  const semester = await prisma.semesters.findFirst({
    where: { id: semesterId, centerId, center: { projectId } },
    select: { startDate: true, endDate: true },
  });
  if (!semester) return "Semester not found in this scope.";

  const eligible = await prisma.userRoleAssignments.findFirst({
    where: {
      userId,
      projectId,
      centerId,
      semesterId,
      subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
    },
    select: { id: true },
  });
  if (!eligible) return "This person is not eligible for remuneration.";

  const semesterStart = semester.startDate.toISOString().slice(0, 10);
  const semesterEnd = semester.endDate.toISOString().slice(0, 10);
  const validationErrors = validateRemunerationPeriods(
    [{ amountPerDay, effectiveFrom, effectiveTo: null }],
    semesterStart,
    semesterEnd,
  );
  if (validationErrors.length > 0) return validationErrors[0];

  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.semesterRemunerationPeriod.findMany({
          where: { userId, semesterId },
          orderBy: { effectiveFrom: "asc" },
        });
        const sameDate = existing.find(
          (period) =>
            period.effectiveFrom.toISOString().slice(0, 10) === effectiveFrom,
        );
        if (sameDate) {
          await tx.semesterRemunerationPeriod.update({
            where: { id: sameDate.id },
            data: { amountPerDay, updatedBy: actorId },
          });
        } else {
          const earlier = existing.filter(
            (period) =>
              period.effectiveFrom.toISOString().slice(0, 10) < effectiveFrom,
          );
          const before = earlier[earlier.length - 1];
          const after = existing.find(
            (period) =>
              period.effectiveFrom.toISOString().slice(0, 10) > effectiveFrom,
          );
          if (before) {
            await tx.semesterRemunerationPeriod.update({
              where: { id: before.id },
              data: { effectiveTo: previousUtcDate(effectiveFrom), updatedBy: actorId },
            });
          }
          await tx.semesterRemunerationPeriod.create({
            data: {
              userId,
              semesterId,
              amountPerDay,
              effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
              effectiveTo: after
                ? previousUtcDate(after.effectiveFrom.toISOString().slice(0, 10))
                : null,
              createdBy: actorId,
              updatedBy: actorId,
            },
          });
        }
        return tx.semesterRemunerationPeriod.findMany({
          where: { userId, semesterId },
          orderBy: { effectiveFrom: "asc" },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error: unknown) {
    console.error("Error updating remuneration schedule:", error);
    return "The remuneration schedule changed. Refresh and try again.";
  }
};

export const updateSemesterRemunerationRates = async ({
  semesterId,
  rates,
}: {
  semesterId: string;
  rates: Array<{ userId: string; dailyRate: number }>;
}) => {
  try {
    return await prisma.$transaction(
      rates.map((rate) =>
        prisma.semesterRemunerationRate.upsert({
          where: {
            userId_semesterId: { userId: rate.userId, semesterId },
          },
          create: {
            userId: rate.userId,
            semesterId,
            dailyRate: rate.dailyRate,
          },
          update: { dailyRate: rate.dailyRate },
        }),
      ),
    );
  } catch (error: unknown) {
    console.error("Error updating semester remuneration rates:", error);
    return "Failed to update remuneration rates";
  }
};

export const getContextStaff = async ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
}) => {
  try {
    return await prisma.user.findMany({
      where: {
        status: UserStatus.APPROVED,
        roleAssignments: {
          some: {
            isActive: true,
            projectId,
            centerId,
            semesterId,
          },
        },
      },
      select: contextStaffSelect({ projectId, centerId, semesterId }),
      orderBy: { name: "asc" },
    });
  } catch (error: unknown) {
    console.error("Error fetching context staff:", error);
    return "Failed to fetch context staff";
  }
};

export const getSemesterUsers = async ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
}) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: UserStatus.APPROVED,
        OR: [
          { roleAssignments: { some: { projectId, centerId, semesterId } } },
          { attendance: { some: { projectId, centerId, semesterId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        roleAssignments: {
          where: { projectId, centerId, semesterId },
          select: {
            id: true,
            subRole: true,
            projectId: true,
            centerId: true,
            semesterId: true,
            semesterLevelId: true,
            level: true,
            committedDays: true,
            isActive: true,
            semesterLevel: { include: { academicLevel: true } },
          },
          orderBy: { assignedAt: "asc" },
        },
        remunerationPeriods: {
          where: { semesterId },
          select: {
            id: true,
            amountPerDay: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
          orderBy: { effectiveFrom: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return users.map((user) => ({
      ...user,
      remunerationPeriods: user.remunerationPeriods.map((period) => ({
        ...period,
        amountPerDay: Number(period.amountPerDay),
        effectiveFrom: period.effectiveFrom.toISOString().slice(0, 10),
        effectiveTo: period.effectiveTo?.toISOString().slice(0, 10) ?? null,
      })),
    }));
  } catch (error: unknown) {
    console.error("Error fetching semester users:", error);
    return "Failed to fetch semester users";
  }
};

export const updateUser = async (
  id: string,
  status: UserStatus,
  role: Role,
  password: string,
) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: status,
        role: role,
        password: password,
      },
    });
    return user;
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return "Failed to update user";
  }
};

// Update only bank details for a user
export const updateUserBankDetails = async (
  id: string,
  data: {
    bankAccountNumber?: string | null;
    bankAccountName?: string | null;
    bankIfsc?: string | null;
    bankName?: string | null;
    bankBranch?: string | null;
    upiId?: string | null;
  },
) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      // Cast to any to allow upiId before prisma generate refreshes types
      data: {
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankAccountName: data.bankAccountName ?? null,
        bankIfsc: data.bankIfsc ?? null,
        bankName: data.bankName ?? null,
        bankBranch: data.bankBranch ?? null,
        upiId: data.upiId ?? null,
      } as any,
    });
    return user;
  } catch (error: unknown) {
    console.error("Error updating user bank details:", error);
    return "Failed to update user bank details";
  }
};

export const getUnverifiedUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
        profileImageUrl: true,
        role: true,
        phone: true,
        qualification: true,
        address: true,
        dob: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  } catch (error: unknown) {
    console.error("Error fetching unverified users:", error);
    return "Failed to fetch unverified users";
  }
};

// Student service functions
export const createStudent = async (studentData: any) => {
  try {
    // Separate enrollments if provided
    const { enrollments, ...studentFields } = studentData;
    const student = await prisma.students.create({
      data: {
        ...studentFields,
        enrollments:
          enrollments && Array.isArray(enrollments)
            ? {
                create: enrollments,
              }
            : undefined,
      },
      include: {
        enrollments: true,
      },
    });
    return student;
  } catch (error: unknown) {
    console.error("Error creating student:", error);
    return "Failed to create student";
  }
};

export const getAllStudents = async () => {
  try {
    const students = await prisma.students.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        enrollments: true,
      },
    });
    return students;
  } catch (error: unknown) {
    console.error("Error fetching students:", error);
    return "Failed to fetch students";
  }
};

export const getStudentById = async (
  id: string,
  visibleEnrollmentScopes?: readonly EnrollmentScope[],
) => {
  try {
    const enrollmentWhere = getVisibleEnrollmentWhere(visibleEnrollmentScopes);
    const student = await prisma.students.findUnique({
      where: { id },
      include: {
        enrollments: enrollmentWhere ? { where: enrollmentWhere } : true,
      },
    });
    return student;
  } catch (error: unknown) {
    console.error("Error fetching student by ID:", error);
    return "Failed to fetch student";
  }
};

export const updateStudent = async (id: string, studentData: any) => {
  try {
    const {
      id: _,
      createdAt,
      updatedAt,
      enrollments,
      ...updateData
    } = studentData;
    // Update student fields
    const student = await prisma.students.update({
      where: { id },
      data: updateData,
      include: {
        enrollments: true,
      },
    });

    // If enrollments provided, update them (replace all for simplicity)
    if (Array.isArray(enrollments)) {
      // Remove all current enrollments for this student
      await (prisma as any).studentEnrollments.deleteMany({
        where: { studentId: id },
      });
      // Add new enrollments
      for (const enrollment of enrollments) {
        await (prisma as any).studentEnrollments.create({
          data: { ...enrollment, studentId: id },
        });
      }
    }

    // Return updated student with enrollments
    const updatedStudent = await prisma.students.findUnique({
      where: { id },
      include: { enrollments: true },
    });
    return updatedStudent;
  } catch (error: unknown) {
    console.error("Error updating student:", error);
    return "Failed to update student";
  }
};

export const deleteStudent = async (id: string) => {
  try {
    const enrollmentCount = await prisma.studentEnrollments.count({
      where: { studentId: id },
    });

    if (enrollmentCount > 0) {
      return "Cannot delete student while enrollments exist";
    }

    await prisma.students.delete({
      where: { id },
    });
    return true;
  } catch (error: unknown) {
    console.error("Error deleting student:", error);
    return "Failed to delete student";
  }
};

export const getStudentsByLevel = async (level: Level) => {
  try {
    // Now get students by their enrollment level, not direct level field
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        level,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
        semesterLevel: { include: { academicLevel: true } },
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by level:", error);
    return "Failed to fetch students by level - Please run 'prisma generate' first";
  }
};

export const getStudentsBySemesterLevel = async (semesterLevelId: string) => {
  try {
    return await prisma.studentEnrollments.findMany({
      where: { semesterLevelId, isActive: true },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
        semesterLevel: { include: { academicLevel: true } },
      },
      orderBy: { student: { name: "asc" } },
    });
  } catch (error: unknown) {
    console.error("Error fetching students by semester level:", error);
    return "Failed to fetch students by semester level";
  }
};

// Placeholder functions for new features - will work after Prisma regeneration
export const getStudentsByProject = async (projectId: string) => {
  try {
    // This will work after running prisma generate
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        projectId,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by project:", error);
    return "Failed to fetch students by project - Please run 'prisma generate' first";
  }
};

export const getStudentsByCenter = async (centerId: string) => {
  try {
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        centerId,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by center:", error);
    return "Failed to fetch students by center - Please run 'prisma generate' first";
  }
};

export const getStudentsBySemester = async (semesterId: string) => {
  try {
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        semesterId,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by semester:", error);
    return "Failed to fetch students by semester - Please run 'prisma generate' first";
  }
};

export type EnrollmentScope = {
  projectId: string;
  centerId: string;
  semesterId: string;
  semesterLevelId: string;
  level: Level;
};

const hydrateVerifiedSemesterLevelScope = async <
  T extends {
    semesterId: string | null;
    semesterLevelId: string | null;
    level: Level | null;
  },
>(
  scope: T,
): Promise<T & { semesterLevelId: string }> => {
  const semesterLevel = await resolveSemesterLevelInput(scope);
  return { ...scope, semesterLevelId: semesterLevel.id };
};

const getVisibleEnrollmentWhere = (
  visibleEnrollmentScopes?: readonly EnrollmentScope[],
): Prisma.StudentEnrollmentsWhereInput | undefined =>
  visibleEnrollmentScopes === undefined
    ? undefined
    : {
        isActive: true,
        OR: visibleEnrollmentScopes.map((scope) => ({
          projectId: scope.projectId,
          centerId: scope.centerId,
          semesterId: scope.semesterId,
          semesterLevelId: scope.semesterLevelId,
        })),
      };

export const getEnrollmentScope = async (
  enrollmentId: string,
): Promise<EnrollmentScope | null> => {
  const enrollment = await prisma.studentEnrollments.findUnique({
    where: { id: enrollmentId },
    select: {
      projectId: true,
      centerId: true,
      semesterId: true,
      semesterLevelId: true,
      level: true,
    },
  });

  return enrollment
    ? ((await hydrateVerifiedSemesterLevelScope(enrollment)) as EnrollmentScope)
    : null;
};

export const getStudentActiveEnrollmentScopes = async (
  studentId: string,
): Promise<EnrollmentScope[]> => {
  const enrollments = await prisma.studentEnrollments.findMany({
    where: { studentId, isActive: true },
    select: {
      projectId: true,
      centerId: true,
      semesterId: true,
      semesterLevelId: true,
      level: true,
    },
  });
  return Promise.all(
    enrollments.map((enrollment) =>
      hydrateVerifiedSemesterLevelScope(enrollment),
    ),
  );
};

export const validateEnrollmentHierarchy = async ({
  projectId,
  centerId,
  semesterId,
}: Pick<EnrollmentScope, "projectId" | "centerId" | "semesterId">): Promise<
  true | string
> => {
  const center = await prisma.centers.findUnique({
    where: { id: centerId },
    select: { projectId: true },
  });

  if (!center) {
    return "Center not found";
  }

  if (center.projectId !== projectId) {
    return "Center does not belong to project";
  }

  const semester = await prisma.semesters.findUnique({
    where: { id: semesterId },
    select: { centerId: true },
  });

  if (!semester) {
    return "Semester not found";
  }

  if (semester.centerId !== centerId) {
    return "Semester does not belong to center";
  }

  return true;
};

export const resolveEffectiveEnrollmentContext = async (
  enrollmentId: string,
  patch: Partial<EnrollmentScope>,
): Promise<EnrollmentScope | string> => {
  const enrollment = await getEnrollmentScope(enrollmentId);

  if (!enrollment) {
    return "Enrollment not found";
  }

  const context = { ...enrollment, ...patch };
  const validation = await validateEnrollmentHierarchy(context);

  return validation === true ? context : validation;
};

export const enrollStudent = async (enrollmentData: {
  studentId: string;
  centerId: string;
  semesterId: string;
  projectId: string;
  semesterLevelId?: string;
  level?: Level;
}) => {
  try {
    const validation = await validateEnrollmentHierarchy(enrollmentData);
    if (validation !== true) {
      return validation;
    }

    const semesterLevel = await resolveSemesterLevelInput(enrollmentData);

    const enrollment = await (prisma as any).studentEnrollments.create({
      data: {
        ...enrollmentData,
        semesterLevelId: semesterLevel.id,
        level: semesterLevel.academicLevel.code as Level,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
        semesterLevel: { include: { academicLevel: true } },
      },
    });
    return enrollment;
  } catch (error: unknown) {
    if (error instanceof AcademicLevelServiceError) throw error;
    console.error("Error enrolling student:", error);
    return "Failed to enroll student - Please run 'prisma generate' first";
  }
};

// Create a new enrollment and deactivate current active enrollment
export const createEnrollment = async (
  studentId: string,
  centerId: string,
  semesterId: string,
  projectId: string,
  level?: Level,
  semesterLevelId?: string,
) => {
  try {
    const validation = await validateEnrollmentHierarchy({
      projectId,
      centerId,
      semesterId,
    });
    if (validation !== true) {
      return validation;
    }

    const semesterLevel = await resolveSemesterLevelInput({
      semesterId,
      semesterLevelId,
      level,
    });

    return await prisma.$transaction(async (tx) => {
      // Deactivate any current active enrollments
      await (tx as any).studentEnrollments.updateMany({
        where: {
          studentId,
          semesterId,
          isActive: true,
        },
        data: {
          isActive: false,
          promotedAt: new Date(),
        },
      });

      // Create new enrollment
      const newEnrollment = await (tx as any).studentEnrollments.create({
        data: {
          studentId,
          centerId,
          semesterId,
          semesterLevelId: semesterLevel.id,
          projectId,
          level: semesterLevel.academicLevel.code as Level,
          isActive: true,
        },
        include: {
          student: true,
          center: true,
          project: true,
          semester: true,
          semesterLevel: { include: { academicLevel: true } },
        },
      });

      return newEnrollment;
    });
  } catch (error: unknown) {
    if (error instanceof AcademicLevelServiceError) throw error;
    console.error("Error creating enrollment:", error);
    return "Failed to create enrollment - Please run 'prisma generate' first";
  }
};

// Get visible enrollments for a student.
export const getStudentEnrollments = async (
  studentId: string,
  visibleEnrollmentScopes?: readonly EnrollmentScope[],
) => {
  try {
    const enrollmentWhere = getVisibleEnrollmentWhere(visibleEnrollmentScopes);
    const enrollments = await prisma.studentEnrollments.findMany({
      where: {
        studentId,
        ...(enrollmentWhere ?? {}),
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: { enrolledAt: "desc" },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching student enrollments:", error);
    return "Failed to fetch student enrollments - Please run 'prisma generate' first";
  }
};

// Update an enrollment
export const updateEnrollment = async (
  enrollmentId: string,
  data: {
    centerId?: string;
    semesterId?: string;
    projectId?: string;
    semesterLevelId?: string;
    level?: Level;
    isActive?: boolean;
  },
) => {
  try {
    const context = await resolveEffectiveEnrollmentContext(enrollmentId, data);
    if (typeof context === "string") {
      return context;
    }

    const semesterLevel = await resolveSemesterLevelInput({
      semesterId: context.semesterId,
      semesterLevelId: data.semesterLevelId ?? context.semesterLevelId,
      level: data.level ?? context.level,
    });
    const updateData = {
      projectId: context.projectId,
      centerId: context.centerId,
      semesterId: context.semesterId,
      semesterLevelId: semesterLevel.id,
      level: semesterLevel.academicLevel.code as Level,
      isActive: data.isActive,
    };

    return await prisma.$transaction(async (tx) => {
      // If setting this enrollment to active, deactivate others for the same student
      if (updateData.isActive === true) {
        const enrollment = await (tx as any).studentEnrollments.findUnique({
          where: { id: enrollmentId },
          select: { studentId: true },
        });

        if (enrollment) {
          await (tx as any).studentEnrollments.updateMany({
            where: {
              studentId: enrollment.studentId,
              isActive: true,
              id: { not: enrollmentId },
            },
            data: {
              isActive: false,
              promotedAt: new Date(),
            },
          });
        }
      }

      // Update the enrollment
      const updatedEnrollment = await (tx as any).studentEnrollments.update({
        where: { id: enrollmentId },
        data: updateData,
        include: {
          student: true,
          center: true,
          project: true,
          semester: true,
          semesterLevel: { include: { academicLevel: true } },
        },
      });

      return updatedEnrollment;
    });
  } catch (error: unknown) {
    if (error instanceof AcademicLevelServiceError) throw error;
    console.error("Error updating enrollment:", error);
    return "Failed to update enrollment - Please run 'prisma generate' first";
  }
};

// Delete an enrollment
export const deleteEnrollment = async (enrollmentId: string) => {
  try {
    await (prisma as any).studentEnrollments.delete({
      where: { id: enrollmentId },
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Error deleting enrollment:", error);
    return "Failed to delete enrollment - Please run 'prisma generate' first";
  }
};

// User Role Assignment Management Functions

type RoleAssignmentInput = {
  userId?: string;
  subRole: SubRole;
  projectId?: string | null;
  centerId?: string | null;
  semesterId?: string | null;
  semesterLevelId?: string | null;
  level?: Level | null;
  committedDays?: any;
  isActive?: boolean;
};

const normalizeRoleAssignment = async <T extends RoleAssignmentInput>(
  assignment: T,
) => {
  if (assignment.semesterLevelId && !assignment.semesterId) {
    await resolveSemesterLevelInput(assignment);
  }

  if (assignment.subRole !== SubRole.EDUCATOR) {
    return { ...assignment, semesterLevelId: null, level: null };
  }

  if (!assignment.semesterLevelId && !assignment.level) {
    return { ...assignment, semesterLevelId: null, level: null };
  }

  const semesterLevel = await resolveSemesterLevelInput(assignment);
  return {
    ...assignment,
    semesterLevelId: semesterLevel.id,
    level: semesterLevel.academicLevel.code as Level,
  };
};

// Validation helper functions
export const validateRoleAssignmentHierarchy = async (assignmentData: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
}) => {
  try {
    const { projectId, centerId, semesterId } = assignmentData;

    // If semester is provided, validate it belongs to the center
    if (semesterId && centerId) {
      const semester = await prisma.semesters.findFirst({
        where: {
          id: semesterId,
          centerId: centerId,
        },
      });

      if (!semester) {
        return {
          isValid: false,
          error: "Semester does not belong to the specified center",
        };
      }
    }

    // If center is provided, validate it belongs to the project
    if (centerId && projectId) {
      const center = await prisma.centers.findFirst({
        where: {
          id: centerId,
          projectId: projectId,
        },
      });

      if (!center) {
        return {
          isValid: false,
          error: "Center does not belong to the specified project",
        };
      }
    }

    // If semester is provided but no center, get the center from semester
    if (semesterId && !centerId) {
      const semester = await prisma.semesters.findUnique({
        where: { id: semesterId },
        include: { center: true },
      });

      if (!semester) {
        return {
          isValid: false,
          error: "Semester not found",
        };
      }

      // If project is also provided, validate semester's center belongs to project
      if (projectId && semester.center.projectId !== projectId) {
        return {
          isValid: false,
          error: "Semester's center does not belong to the specified project",
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error("Error validating role assignment hierarchy:", error);
    return {
      isValid: false,
      error: "Failed to validate assignment hierarchy",
    };
  }
};

export const createUserRoleAssignment = async (assignmentData: {
  userId: string;
  subRole: SubRole;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
  level?: Level;
  committedDays?: any; // CommittedDays enum
}) => {
  try {
    // Validate hierarchy relationships
    const validation = await validateRoleAssignmentHierarchy({
      projectId: assignmentData.projectId,
      centerId: assignmentData.centerId,
      semesterId: assignmentData.semesterId,
    });

    if (!validation.isValid) {
      return `Validation error: ${validation.error}`;
    }

    const normalizedAssignment = await normalizeRoleAssignment(assignmentData);
    const assignment = await (prisma as any).userRoleAssignments.create({
      data: normalizedAssignment,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
        semesterLevel: { include: { academicLevel: true } },
      },
    });
    return assignment;
  } catch (error: unknown) {
    if (error instanceof AcademicLevelServiceError) return error.message;
    console.error("Error creating user role assignment:", error);
    return "Failed to create user role assignment - Please run 'prisma generate' first";
  }
};

export const getUserRoleAssignments = async (userId: string) => {
  try {
    const assignments = await (prisma as any).userRoleAssignments.findMany({
      where: { userId, isActive: true },
      include: {
        project: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
        semesterLevel: { include: { academicLevel: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    return assignments;
  } catch (error: unknown) {
    console.error("Error fetching user role assignments:", error);
    return "Failed to fetch user role assignments - Please run 'prisma generate' first";
  }
};

export const getActiveUserScopeAssignments = async (userId: string) => {
  try {
    const assignments = await prisma.userRoleAssignments.findMany({
      where: { userId, isActive: true },
      select: {
        subRole: true,
        projectId: true,
        centerId: true,
        semesterId: true,
        semesterLevelId: true,
        level: true,
        isActive: true,
      },
    });
    return Promise.all(
      assignments.map(async (assignment) => {
        if (
          assignment.subRole !== SubRole.EDUCATOR ||
          (!assignment.semesterLevelId && !assignment.level)
        ) {
          return assignment;
        }
        return hydrateVerifiedSemesterLevelScope(assignment);
      }),
    );
  } catch (error: unknown) {
    console.error("Error fetching active user scope assignments:", error);
    return "Failed to fetch active user scope assignments";
  }
};

export const updateUserRoleAssignment = async (
  assignmentId: string,
  updateData: any,
) => {
  try {
    const current = await prisma.userRoleAssignments.findUnique({
      where: { id: assignmentId },
    });
    if (!current) return "User role assignment not found";

    const effectiveAssignment = { ...current, ...updateData };
    const validation = await validateRoleAssignmentHierarchy({
      projectId: effectiveAssignment.projectId ?? undefined,
      centerId: effectiveAssignment.centerId ?? undefined,
      semesterId: effectiveAssignment.semesterId ?? undefined,
    });
    if (!validation.isValid) return `Validation error: ${validation.error}`;

    const normalizedAssignment =
      await normalizeRoleAssignment(effectiveAssignment);
    const assignment = await (prisma as any).userRoleAssignments.update({
      where: { id: assignmentId },
      data: normalizedAssignment,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
        semesterLevel: { include: { academicLevel: true } },
      },
    });
    return assignment;
  } catch (error: unknown) {
    if (error instanceof AcademicLevelServiceError) return error.message;
    console.error("Error updating user role assignment:", error);
    return "Failed to update user role assignment - Please run 'prisma generate' first";
  }
};

export const deleteUserRoleAssignment = async (assignmentId: string) => {
  try {
    await (prisma as any).userRoleAssignments.update({
      where: { id: assignmentId },
      data: { isActive: false },
    });
    return true;
  } catch (error: unknown) {
    console.error("Error deleting user role assignment:", error);
    return "Failed to delete user role assignment - Please run 'prisma generate' first";
  }
};

export const getAllUsersWithAssignments = async () => {
  try {
    const users = await prisma.user.findMany({
      select: adminUserSelect,
      orderBy: { createdAt: "desc" },
    });
    return users;
  } catch (error: unknown) {
    console.error("Error fetching all users with assignments:", error);
    return "Failed to fetch users with assignments";
  }
};

export const bulkUpdateUserAssignments = async (
  userId: string,
  newAssignments: Array<{
    subRole: SubRole;
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    semesterLevelId?: string;
    level?: Level;
    committedDays?: any;
  }>,
): Promise<any> => {
  try {
    // Validate all assignments before processing
    for (const assignment of newAssignments) {
      const validation = await validateRoleAssignmentHierarchy({
        projectId: assignment.projectId,
        centerId: assignment.centerId,
        semesterId: assignment.semesterId,
      });

      if (!validation.isValid) {
        return `Validation error for assignment: ${validation.error}`;
      }
    }

    const normalizedAssignments = await Promise.all(
      newAssignments.map(normalizeRoleAssignment),
    );

    // Check for exact duplicates in the new assignments array
    const assignmentKeys = new Set();
    for (const assignment of normalizedAssignments) {
      const key = `${assignment.subRole}-${assignment.projectId || "null"}-${
        assignment.centerId || "null"
      }-${assignment.semesterId || "null"}-${assignment.semesterLevelId || "null"}`;
      if (assignmentKeys.has(key)) {
        console.warn(
          `Duplicate assignment detected and will be skipped: ${key}`,
        );
        // Remove duplicates by filtering the array
        const filteredAssignments = [];
        const seenKeys = new Set();
        for (const assign of normalizedAssignments) {
          const assignKey = `${assign.subRole}-${assign.projectId || "null"}-${
            assign.centerId || "null"
          }-${assign.semesterId || "null"}-${assign.semesterLevelId || "null"}`;
          if (!seenKeys.has(assignKey)) {
            seenKeys.add(assignKey);
            filteredAssignments.push(assign);
          }
        }
        return await bulkUpdateUserAssignments(userId, filteredAssignments);
      }
      assignmentKeys.add(key);
    }

    return await prisma.$transaction(async (tx) => {
      const assignmentKey = (assignment: {
        subRole: SubRole;
        projectId?: string | null;
        centerId?: string | null;
        semesterId?: string | null;
        semesterLevelId?: string | null;
        committedDays?: unknown;
      }) =>
        [
          assignment.subRole,
          assignment.projectId ?? "",
          assignment.centerId ?? "",
          assignment.semesterId ?? "",
          assignment.semesterLevelId ?? "",
          assignment.committedDays ?? "",
        ].join("|");

      const existingAssignments = await (
        tx as any
      ).userRoleAssignments.findMany({
        where: { userId, isActive: true },
      });
      const existingByKey = new Map(
        existingAssignments.map((assignment: any) => [
          assignmentKey(assignment),
          assignment,
        ]),
      );
      const requestedKeys = new Set(
        normalizedAssignments.map(assignmentKey),
      );
      const removedIds = existingAssignments
        .filter(
          (assignment: any) => !requestedKeys.has(assignmentKey(assignment)),
        )
        .map((assignment: any) => assignment.id);

      if (removedIds.length > 0) {
        await (tx as any).userRoleAssignments.updateMany({
          where: { id: { in: removedIds } },
          data: { isActive: false },
        });
      }

      const reconciledAssignments = [];
      for (const assignment of normalizedAssignments) {
        const existing = existingByKey.get(assignmentKey(assignment));
        if (existing) {
          reconciledAssignments.push(existing);
          continue;
        }
        const created = await (tx as any).userRoleAssignments.create({
          data: {
            userId,
            ...assignment,
          },
          include: {
            project: { select: { id: true, name: true } },
            center: { select: { id: true, name: true } },
            semester: { select: { id: true, name: true } },
            semesterLevel: { include: { academicLevel: true } },
          },
        });
        reconciledAssignments.push(created);
      }
      return reconciledAssignments;
    });
  } catch (error: unknown) {
    if (error instanceof AcademicLevelServiceError) return error.message;
    console.error("Error bulk updating user assignments:", error);
    return "Failed to bulk update user assignments - Please run 'prisma generate' first";
  }
};

export const updateSemesterUserAssignments = async ({
  userId,
  projectId,
  centerId,
  semesterId,
  assignments,
}: {
  userId: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  assignments: Array<{
    subRole: SubRole;
    semesterLevelId?: string;
    committedDays?: CommittedDays;
  }>;
}) => {
  const outsideScope = await prisma.userRoleAssignments.findMany({
    where: {
      userId,
      isActive: true,
      NOT: { projectId, centerId, semesterId },
    },
    select: {
      subRole: true,
      projectId: true,
      centerId: true,
      semesterId: true,
      semesterLevelId: true,
      level: true,
      committedDays: true,
    },
  });
  return bulkUpdateUserAssignments(userId, [
    ...outsideScope.map((assignment) => ({
      ...assignment,
      projectId: assignment.projectId ?? undefined,
      centerId: assignment.centerId ?? undefined,
      semesterId: assignment.semesterId ?? undefined,
      semesterLevelId: assignment.semesterLevelId ?? undefined,
      level: assignment.level ?? undefined,
      committedDays: assignment.committedDays ?? undefined,
    })),
    ...assignments.map((assignment) => ({
      ...assignment,
      projectId,
      centerId,
      semesterId,
    })),
  ]);
};

// Role-based access functions for projects, centers, semesters

export const getUserAccessibleProjects = async (
  userId: string,
  role: string,
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all projects
      const projects = await prisma.projects.findMany({
        orderBy: { createdAt: "desc" },
      });
      return projects;
    } else {
      // USER role - get only projects they're assigned to
      const userAssignments = await (
        prisma as any
      ).userRoleAssignments.findMany({
        where: { userId, isActive: true, projectId: { not: null } },
        include: {
          project: true,
        },
        distinct: ["projectId"],
      });

      const projects = userAssignments
        .map((assignment: any) => assignment.project)
        .filter(Boolean);
      return projects;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible projects:", error);
    return "Failed to fetch accessible projects";
  }
};

export const getUserAccessibleCenters = async (
  userId: string,
  role: string,
  projectId?: string,
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all centers, optionally filtered by project
      const whereClause = projectId ? { projectId } : {};
      const centers = await prisma.centers.findMany({
        where: whereClause,
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return centers;
    } else {
      // USER role - get only centers they're assigned to
      const whereClause: any = {
        userId,
        isActive: true,
        centerId: { not: null },
      };
      if (projectId) {
        whereClause.projectId = projectId;
      }

      const userAssignments = await (
        prisma as any
      ).userRoleAssignments.findMany({
        where: whereClause,
        include: {
          center: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
        },
        distinct: ["centerId"],
      });

      const centers = userAssignments
        .map((assignment: any) => assignment.center)
        .filter(Boolean);
      return centers;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible centers:", error);
    return "Failed to fetch accessible centers";
  }
};

export const getUserAccessibleSemesters = async (
  userId: string,
  role: string,
  centerId?: string,
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all semesters, optionally filtered by center
      const whereClause = centerId ? { centerId } : {};
      const semesters = await prisma.semesters.findMany({
        where: whereClause,
        include: {
          center: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
          levels: {
            where: { isActive: true },
            include: { academicLevel: true },
            orderBy: { academicLevel: { journeyOrder: "asc" } },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return semesters;
    } else {
      // USER role - get only semesters they're assigned to
      const whereClause: any = {
        userId,
        isActive: true,
        semesterId: { not: null },
      };
      if (centerId) {
        whereClause.centerId = centerId;
      }

      const userAssignments = await (
        prisma as any
      ).userRoleAssignments.findMany({
        where: whereClause,
        include: {
          semester: {
            include: {
              center: {
                include: {
                  project: { select: { id: true, name: true } },
                },
              },
              levels: {
                where: { isActive: true },
                include: { academicLevel: true },
                orderBy: { academicLevel: { journeyOrder: "asc" } },
              },
            },
          },
        },
        distinct: ["semesterId"],
      });

      const semesters = userAssignments
        .map((assignment: any) => assignment.semester)
        .filter(Boolean);
      return semesters;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible semesters:", error);
    return "Failed to fetch accessible semesters";
  }
};

export const getUserAccessibleStudents = async (
  userId: string,
  role: string,
  filters?: {
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    semesterLevelId?: string;
    level?: Level;
  },
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all students with optional filters
      let whereClause: any = { isActive: true };

      if (filters?.projectId) whereClause.projectId = filters.projectId;
      if (filters?.centerId) whereClause.centerId = filters.centerId;
      if (filters?.semesterId) whereClause.semesterId = filters.semesterId;
      if (filters?.semesterLevelId)
        whereClause.semesterLevelId = filters.semesterLevelId;
      if (filters?.level) whereClause.level = filters.level;

      const enrollments = await (prisma as any).studentEnrollments.findMany({
        where: whereClause,
        include: {
          student: true,
          center: true,
          project: true,
          semester: true,
          semesterLevel: { include: { academicLevel: true } },
        },
        orderBy: {
          student: { name: "asc" },
        },
      });
      return enrollments;
    } else {
      // USER role - get only students from centers/projects/semesters they're assigned to
      const userAssignments = await prisma.userRoleAssignments.findMany({
        where: { userId, isActive: true },
        select: {
          subRole: true,
          projectId: true,
          centerId: true,
          semesterId: true,
          semesterLevelId: true,
          level: true,
        },
      });

      const orConditions: Prisma.StudentEnrollmentsWhereInput[] =
        userAssignments.flatMap((assignment) => {
          if (
            !assignment.projectId ||
            !assignment.centerId ||
            !assignment.semesterId ||
            (assignment.subRole === SubRole.EDUCATOR &&
              !assignment.semesterLevelId)
          ) {
            return [];
          }

          const educatorSemesterLevelId = assignment.semesterLevelId;
          return [
            {
              isActive: true,
              projectId: assignment.projectId,
              centerId: assignment.centerId,
              semesterId: assignment.semesterId,
              ...(assignment.subRole === SubRole.EDUCATOR
                ? { semesterLevelId: educatorSemesterLevelId! }
                : {}),
            },
          ];
        });

      if (orConditions.length === 0) {
        return [];
      }

      const whereClause: Prisma.StudentEnrollmentsWhereInput = {
        OR: orConditions,
      };

      // Apply additional filters if provided
      if (filters?.projectId) whereClause.projectId = filters.projectId;
      if (filters?.centerId) whereClause.centerId = filters.centerId;
      if (filters?.semesterId) whereClause.semesterId = filters.semesterId;
      if (filters?.semesterLevelId)
        whereClause.semesterLevelId = filters.semesterLevelId;
      if (filters?.level) whereClause.level = filters.level;

      const enrollments = await (prisma as any).studentEnrollments.findMany({
        where: whereClause,
        include: {
          student: true,
          center: true,
          project: true,
          semester: true,
          semesterLevel: { include: { academicLevel: true } },
        },
        orderBy: {
          student: { name: "asc" },
        },
      });
      return enrollments;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible students:", error);
    return "Failed to fetch accessible students";
  }
};
