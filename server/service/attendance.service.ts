import {
  AttendanceStatus,
  CommittedDays,
  SubRole,
} from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import { buildRemunerationSourceKey } from "./expense.service.js";
import {
  GetActiveUsersForAttendanceRequest,
  GetActiveUsersForAttendanceResponse,
  MarkBulkAttendanceRequest,
  GetAttendanceRequest,
  GetAttendanceResponse,
  AttendanceUser,
} from "../types/attendance.types.js";

export const getRelevantCommittedDays = (date: string): CommittedDays[] => {
  const dayOfWeek = new Date(date).getUTCDay();

  if (dayOfWeek === 6) {
    return [CommittedDays.SATURDAY, CommittedDays.BOTH];
  }

  if (dayOfWeek === 0) {
    return [CommittedDays.SUNDAY, CommittedDays.BOTH];
  }

  return [];
};

/**
 * Get active educators and center managers for attendance marking
 */
export const getActiveUsersForAttendance = async (
  request: GetActiveUsersForAttendanceRequest,
): Promise<GetActiveUsersForAttendanceResponse> => {
  const { date, semesterId, centerId, projectId } = request;

  const relevantCommittedDays = getRelevantCommittedDays(date);

  // If it's not a weekend day, return empty result
  if (relevantCommittedDays.length === 0) {
    return {
      users: [],
      totalUsers: 0,
    };
  }

  const whereClause: any = {
    status: "APPROVED",
    roleAssignments: {
      some: {
        isActive: true,
        subRole: {
          in: ["EDUCATOR", "CENTER_MANAGER"],
        },
        projectId: projectId,
        centerId: centerId,
        semesterId: semesterId,
      },
    },
  };

  const users = await prisma.user.findMany({
    where: whereClause,
    include: {
      roleAssignments: {
        where: {
          isActive: true,
          subRole: {
            in: ["EDUCATOR", "CENTER_MANAGER"],
          },
          projectId: projectId,
          ...(centerId && { centerId }),
          ...(semesterId && { semesterId }),
        },
        include: {
          project: {
            select: { name: true },
          },
          center: {
            select: { name: true },
          },
          semester: {
            select: { name: true },
          },
          semesterLevel: {
            include: { academicLevel: true },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const mappedUsers: AttendanceUser[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    profileImageUrl: user.profileImageUrl || undefined,
    roleAssignments: user.roleAssignments.map((assignment) => ({
      id: assignment.id,
      subRole: assignment.subRole as string,
      semesterLevelId: assignment.semesterLevelId || undefined,
      semesterLevel: assignment.semesterLevel || undefined,
      committedDays: (assignment.committedDays as CommittedDays) || undefined,
      projectId: assignment.projectId || undefined,
      centerId: assignment.centerId || undefined,
      semesterId: assignment.semesterId || undefined,
      isActive: assignment.isActive,
    })),
  }));

  return {
    users: mappedUsers,
    totalUsers: mappedUsers.length,
  };
};

// Marks one class day for many staff in a single transaction.
export const markBulkAttendance = async (
  request: MarkBulkAttendanceRequest,
  markedBy: string,
): Promise<{ message: string; processedCount: number; errors: string[] }> => {
  const { date, projectId, centerId, semesterId, attendances } = request;
  const errors: string[] = [];
  const requestDate = new Date(date);
  const now = new Date();

  try {
    const roleAssignments = await prisma.userRoleAssignments.findMany({
      where: {
        id: {
          in: attendances.map((attendance) => attendance.roleAssignmentId),
        },
        isActive: true,
        projectId,
        centerId,
        semesterId,
        subRole: { in: [SubRole.EDUCATOR, SubRole.CENTER_MANAGER] },
      },
      select: { id: true, userId: true },
    });
    const assignmentUserIds = new Map(
      roleAssignments.map((assignment) => [assignment.id, assignment.userId]),
    );
    // Payments can't be undone, so a paid month's attendance stays as paid.
    const month = date.slice(0, 7);
    const paidUserIds = new Set(
      (
        await prisma.expense.findMany({
          where: {
            OR: attendances.map(({ userId }) => ({
              sourceKey: {
                startsWith: buildRemunerationSourceKey(semesterId, userId, month),
              },
            })),
          },
          select: { payeeUserId: true },
        })
      ).map((expense) => expense.payeeUserId),
    );

    // Pre-validate all attendance data
    const validAttendances: typeof attendances = [];
    for (const attendanceData of attendances) {
      if (
        assignmentUserIds.get(attendanceData.roleAssignmentId) !==
        attendanceData.userId
      ) {
        errors.push(
          `User ${attendanceData.userId}: Invalid attendance role assignment`,
        );
        continue;
      }

      if (paidUserIds.has(attendanceData.userId)) {
        errors.push(
          `User ${attendanceData.userId}: ${month} is already paid, so this attendance can't change`,
        );
        continue;
      }

      // Validate holiday reason is provided when status is HOLIDAY
      if (
        attendanceData.status === AttendanceStatus.HOLIDAY &&
        !attendanceData.holidayReason
      ) {
        errors.push(
          `User ${attendanceData.userId}: Holiday reason is required when marking as holiday`,
        );
        continue;
      }
      validAttendances.push(attendanceData);
    }

    // If no valid attendances, return early
    if (validAttendances.length === 0) {
      return {
        message: `Bulk attendance marking failed - no valid records to process.`,
        processedCount: 0,
        errors,
      };
    }

    // Use a single database transaction with batched operations for maximum efficiency
    const result = await prisma.$transaction(async (tx) => {
      let successCount = 0;

      // Process attendances in smaller batches to avoid memory issues
      const batchSize = 10;
      for (let i = 0; i < validAttendances.length; i += batchSize) {
        const batch = validAttendances.slice(i, i + batchSize);

        // Process each item in the batch
        for (const attendanceData of batch) {
          // Use upsert for each record - this is still faster than individual transactions
          await tx.userAttendance.upsert({
            where: {
              userId_date_projectId_centerId_semesterId: {
                userId: attendanceData.userId,
                date: requestDate,
                projectId,
                centerId,
                semesterId,
              },
            },
            update: {
              status: attendanceData.status,
              roleAssignmentId: attendanceData.roleAssignmentId,
              notes: attendanceData.notes || null,
              holidayReason:
                attendanceData.status === AttendanceStatus.HOLIDAY
                  ? attendanceData.holidayReason
                  : null,
              markedBy,
              markedAt: now,
              updatedAt: now,
            },
            create: {
              userId: attendanceData.userId,
              date: requestDate,
              status: attendanceData.status,
              roleAssignmentId: attendanceData.roleAssignmentId,
              projectId,
              centerId,
              semesterId,
              notes: attendanceData.notes || null,
              holidayReason:
                attendanceData.status === AttendanceStatus.HOLIDAY
                  ? attendanceData.holidayReason
                  : null,
              markedBy,
              markedAt: now,
            },
          });
          successCount++;
        }
      }

      return successCount;
    });

    return {
      message: `Bulk attendance marking completed. Processed ${result}/${attendances.length} records.`,
      processedCount: result,
      errors,
    };
  } catch (error: any) {
    console.error("Bulk attendance marking transaction failed:", error);

    // If the entire transaction fails due to timeout or other issues
    if (error.message.includes("timeout") || error.code === "P2024") {
      errors.push(
        `Transaction timed out. Try processing fewer records at once.`,
      );
    } else {
      errors.push("Transaction failed while marking attendance");
    }

    return {
      message: `Bulk attendance marking failed.`,
      processedCount: 0,
      errors,
    };
  }
};

/**
 * Get attendance records with filtering and pagination
 */
export const getAttendanceRecords = async (
  request: GetAttendanceRequest,
): Promise<GetAttendanceResponse> => {
  const {
    startDate,
    endDate,
    userId,
    projectId,
    centerId,
    semesterId,
    status,
    page = 1,
    limit = 50,
    activeAssignmentsOnly = false,
  } = request;

  const skip = (page - 1) * limit;

  const whereClause: any = {};

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) {
      // Normalize to start of day (UTC) to avoid timezone drift
      whereClause.date.gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      // Make end date inclusive by setting to end of day (UTC)
      whereClause.date.lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  if (userId) whereClause.userId = userId;
  if (projectId) whereClause.projectId = projectId;
  if (centerId) whereClause.centerId = centerId;
  if (semesterId) whereClause.semesterId = semesterId;
  if (status) whereClause.status = status;
  if (activeAssignmentsOnly) whereClause.roleAssignment = { isActive: true };

  const [attendances, totalCount] = await Promise.all([
    prisma.userAttendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true, profileImageUrl: true },
        },
        project: {
          select: { name: true },
        },
        center: {
          select: { name: true },
        },
        semester: {
          select: { name: true },
        },
        roleAssignment: {
          select: {
            id: true,
            subRole: true,
            semesterLevelId: true,
            semesterLevel: { include: { academicLevel: true } },
            committedDays: true,
          },
        },
        markedByUser: {
          select: { name: true },
        },
      },
      orderBy: [{ date: "desc" }, { user: { name: "asc" } }],
      skip,
      take: limit,
    }),
    prisma.userAttendance.count({
      where: whereClause,
    }),
  ]);

  const mappedAttendances = attendances.map((attendance: any) => ({
    id: attendance.id,
    userId: attendance.userId,
    userName: attendance.user.name,
    userEmail: attendance.user.email,
    user: {
      id: attendance.userId,
      name: attendance.user.name,
      email: attendance.user.email,
      profileImageUrl: attendance.user.profileImageUrl || undefined,
    },
    date: attendance.date.toISOString().split("T")[0],
    status: attendance.status as AttendanceStatus,
    projectId: attendance.projectId,
    projectName: attendance.project.name,
    centerId: attendance.centerId,
    centerName: attendance.center.name,
    semesterId: attendance.semesterId,
    semesterName: attendance.semester.name,
    notes: attendance.notes || undefined,
    holidayReason: attendance.holidayReason || undefined,
    markedBy: attendance.markedBy || undefined,
    markedByName: attendance.markedByUser?.name,
    markedAt: attendance.markedAt?.toISOString(),
    roleAssignment: {
      id: attendance.roleAssignment.id,
      subRole: attendance.roleAssignment.subRole,
      semesterLevelId: attendance.roleAssignment.semesterLevelId || undefined,
      semesterLevel: attendance.roleAssignment.semesterLevel || undefined,
      committedDays: attendance.roleAssignment.committedDays || undefined,
    },
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    attendances: mappedAttendances,
    totalCount,
    page,
    limit,
    totalPages,
  };
};

