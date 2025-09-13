import {
  PrismaClient,
  AttendanceStatus,
  CommittedDays,
} from "../generated/prisma/index.js";
import {
  GetActiveUsersForAttendanceRequest,
  GetActiveUsersForAttendanceResponse,
  MarkAttendanceRequest,
  MarkBulkAttendanceRequest,
  MarkAttendanceResponse,
  GetAttendanceRequest,
  GetAttendanceResponse,
  GetAttendanceSummaryRequest,
  GetAttendanceSummaryResponse,
  AttendanceUser,
  AttendanceSummary,
} from "../types/attendance.types.js";

const prisma = new PrismaClient();

/**
 * Get active educators and center managers for attendance marking
 */
export const getActiveUsersForAttendance = async (
  request: GetActiveUsersForAttendanceRequest
): Promise<GetActiveUsersForAttendanceResponse> => {
  const { date, semesterId, centerId, projectId } = request;

  // Parse the date to get day of week (0 = Sunday, 6 = Saturday)
  const requestDate = new Date(date);
  const dayOfWeek = requestDate.getDay();

  // Determine which committed days are relevant for this date
  const relevantCommittedDays: CommittedDays[] = [];
  if (dayOfWeek === 6 || dayOfWeek === 0) {
    // For any weekend day (Saturday or Sunday), include all weekend committed days
    relevantCommittedDays.push(
      CommittedDays.SATURDAY,
      CommittedDays.SUNDAY,
      CommittedDays.BOTH
    );
  }

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
        committedDays: {
          in: relevantCommittedDays,
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
          committedDays: {
            in: relevantCommittedDays,
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
      level: (assignment.level as string) || undefined,
      committedDays: (assignment.committedDays as CommittedDays) || undefined,
      projectId: assignment.projectId || undefined,
      centerId: assignment.centerId || undefined,
      semesterId: assignment.semesterId || undefined,
    })),
  }));

  return {
    users: mappedUsers,
    totalUsers: mappedUsers.length,
  };
};

/**
 * Mark attendance for a single user
 */
export const markAttendance = async (
  request: MarkAttendanceRequest,
  markedBy: string
): Promise<MarkAttendanceResponse> => {
  const {
    userId,
    date,
    status,
    roleAssignmentId,
    projectId,
    centerId,
    semesterId,
    notes,
    holidayReason,
  } = request;

  // Validate holiday reason is provided when status is HOLIDAY
  if (status === AttendanceStatus.HOLIDAY && !holidayReason) {
    throw new Error("Holiday reason is required when marking as holiday");
  }

  // Check if attendance already exists for this date and context
  const existingAttendance = await prisma.userAttendance.findFirst({
    where: {
      userId,
      date: new Date(date),
      projectId,
      centerId,
      semesterId,
      roleAssignmentId,
    },
  });

  let attendance;

  if (existingAttendance) {
    // Update existing attendance
    attendance = await prisma.userAttendance.update({
      where: {
        id: existingAttendance.id,
      },
      data: {
        status,
        roleAssignmentId,
        notes,
        holidayReason:
          status === AttendanceStatus.HOLIDAY ? holidayReason : null,
        markedBy,
        markedAt: new Date(),
      },
      include: {
        user: {
          select: { name: true, email: true },
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
      },
    });
  } else {
    // Create new attendance record
    attendance = await prisma.userAttendance.create({
      data: {
        userId,
        date: new Date(date),
        status,
        roleAssignmentId,
        projectId,
        centerId,
        semesterId,
        notes,
        holidayReason:
          status === AttendanceStatus.HOLIDAY ? holidayReason : null,
        markedBy,
        markedAt: new Date(),
      },
      include: {
        user: {
          select: { name: true, email: true },
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
      },
    });
  }

  return {
    message: "Attendance marked successfully",
    attendance: {
      id: attendance.id,
      userId: attendance.userId,
      date: attendance.date.toISOString().split("T")[0],
      status: attendance.status as AttendanceStatus,
      projectId: attendance.projectId,
      centerId: attendance.centerId,
      semesterId: attendance.semesterId,
      notes: attendance.notes || undefined,
      holidayReason: attendance.holidayReason || undefined,
      markedBy: attendance.markedBy || undefined,
      markedAt: attendance.markedAt?.toISOString(),
    },
  };
};

/**
 * Mark attendance for multiple users in bulk - Optimized for serverless environments
 *
 * PERFORMANCE OPTIMIZATION:
 * - Uses a single transaction instead of individual markAttendance() calls
 * - Processes records in batches to prevent memory issues
 * - Includes 8-second timeout to stay under Vercel's 10-second limit
 * - Pre-validates all data to fail fast on errors
 *
 * ALTERNATIVE: For even better performance with very large batches, consider using raw SQL:
 * ```sql
 * INSERT INTO "UserAttendance" ("userId","roleAssignmentId","date","status","projectId","centerId","semesterId","markedBy","markedAt")
 * VALUES ...
 * ON CONFLICT ("userId","date","projectId","centerId","semesterId")
 * DO UPDATE SET "status"=EXCLUDED."status", "markedBy"=EXCLUDED."markedBy", "markedAt"=EXCLUDED."markedAt"
 * ```
 */
export const markBulkAttendance = async (
  request: MarkBulkAttendanceRequest,
  markedBy: string
): Promise<{ message: string; processedCount: number; errors: string[] }> => {
  const { date, projectId, centerId, semesterId, attendances } = request;
  const errors: string[] = [];
  const requestDate = new Date(date);
  const now = new Date();

  try {
    // Pre-validate all attendance data
    const validAttendances: typeof attendances = [];
    for (const attendanceData of attendances) {
      // Validate holiday reason is provided when status is HOLIDAY
      if (
        attendanceData.status === AttendanceStatus.HOLIDAY &&
        !attendanceData.holidayReason
      ) {
        errors.push(
          `User ${attendanceData.userId}: Holiday reason is required when marking as holiday`
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
    const result = await prisma.$transaction(
      async (tx) => {
        let successCount = 0;

        // Process attendances in smaller batches to avoid memory issues
        const batchSize = 10;
        for (let i = 0; i < validAttendances.length; i += batchSize) {
          const batch = validAttendances.slice(i, i + batchSize);

          // Process each item in the batch
          for (const attendanceData of batch) {
            try {
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
            } catch (error: any) {
              console.error(
                `Error processing attendance for user ${attendanceData.userId}:`,
                error
              );
              errors.push(`User ${attendanceData.userId}: ${error.message}`);
            }
          }
        }

        return successCount;
      },
      {
        timeout: 8000, // Set timeout to 8 seconds (less than Vercel's 10s limit)
      }
    );

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
        `Transaction timed out. Try processing fewer records at once.`
      );
    } else {
      errors.push(`Transaction failed: ${error.message}`);
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
  request: GetAttendanceRequest
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

  const [attendances, totalCount] = await Promise.all([
    prisma.userAttendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true },
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
            level: true,
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
      level: attendance.roleAssignment.level || undefined,
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

/**
 * Get attendance summary/report for users
 */
export const getAttendanceSummary = async (
  request: GetAttendanceSummaryRequest
): Promise<GetAttendanceSummaryResponse> => {
  const { startDate, endDate, projectId, centerId, semesterId, userIds } =
    request;

  const whereClause: any = {
    date: {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`),
    },
  };

  if (projectId) whereClause.projectId = projectId;
  if (centerId) whereClause.centerId = centerId;
  if (semesterId) whereClause.semesterId = semesterId;
  if (userIds && userIds.length > 0) whereClause.userId = { in: userIds };

  const attendances = await prisma.userAttendance.findMany({
    where: whereClause,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: {
      user: { name: "asc" },
    },
  });

  // Group by user and calculate summary
  const userSummaryMap = new Map<string, AttendanceSummary>();

  attendances.forEach((attendance: any) => {
    const userId = attendance.userId;

    if (!userSummaryMap.has(userId)) {
      userSummaryMap.set(userId, {
        userId,
        userName: attendance.user.name,
        userEmail: attendance.user.email,
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        notAvailableDays: 0,
        holidayDays: 0,
        attendancePercentage: 0,
      });
    }

    const summary = userSummaryMap.get(userId)!;
    summary.totalDays++;

    switch (attendance.status) {
      case "PRESENT":
        summary.presentDays++;
        break;
      case "ABSENT":
        summary.absentDays++;
        break;
      case "NOT_AVAILABLE":
        summary.notAvailableDays++;
        break;
      case "HOLIDAY":
        summary.holidayDays++;
        break;
    }
  });

  // Calculate attendance percentage (excluding holidays and not available days)
  const summaryArray = Array.from(userSummaryMap.values()).map((summary) => {
    const workingDays =
      summary.totalDays - summary.holidayDays - summary.notAvailableDays;
    summary.attendancePercentage =
      workingDays > 0
        ? Math.round((summary.presentDays / workingDays) * 100)
        : 0;
    return summary;
  });

  // Calculate period info
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

  // Count weekend days in the period
  let weekendDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Sunday or Saturday
      weekendDays++;
    }
  }

  return {
    summary: summaryArray,
    periodInfo: {
      startDate,
      endDate,
      totalDays,
      weekendDays,
    },
  };
};

/**
 * Auto-mark attendance based on committed days logic
 */
export const autoMarkAttendance = async (
  date: string,
  projectId: string,
  centerId: string,
  semesterId: string
): Promise<{ message: string; processedCount: number }> => {
  const requestDate = new Date(date);
  const dayOfWeek = requestDate.getDay();

  // Only process weekend days
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    return {
      message: "Auto-marking only works for weekend days",
      processedCount: 0,
    };
  }

  // Get all active users for this date
  const activeUsers = await getActiveUsersForAttendance({
    date,
    projectId,
    centerId,
    semesterId,
  });

  let processedCount = 0;

  for (const user of activeUsers.users) {
    for (const roleAssignment of user.roleAssignments) {
      try {
        // Check if attendance already exists
        const existingAttendance = await prisma.userAttendance.findFirst({
          where: {
            userId: user.id,
            date: requestDate,
            projectId,
            centerId: centerId,
            semesterId: semesterId,
          },
        });

        if (!existingAttendance) {
          // Mark as NOT_AVAILABLE by default (will be overridden when they mark present)
          await prisma.userAttendance.create({
            data: {
              userId: user.id,
              date: requestDate,
              status: AttendanceStatus.NOT_AVAILABLE,
              roleAssignmentId: roleAssignment.id,
              projectId,
              centerId,
              semesterId,
              notes: "Auto-marked as not available",
            },
          });
          processedCount++;
        }
      } catch (error) {
        console.error(
          `Error auto-marking attendance for user ${user.id}:`,
          error
        );
      }
    }
  }

  return {
    message: `Auto-marked attendance for ${processedCount} user assignments`,
    processedCount,
  };
};
