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
  if (dayOfWeek === 6) {
    // Saturday
    relevantCommittedDays.push(CommittedDays.SATURDAY, CommittedDays.BOTH);
  } else if (dayOfWeek === 0) {
    // Sunday
    relevantCommittedDays.push(CommittedDays.SUNDAY, CommittedDays.BOTH);
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
 * Mark attendance for multiple users in bulk
 */
export const markBulkAttendance = async (
  request: MarkBulkAttendanceRequest,
  markedBy: string
): Promise<{ message: string; processedCount: number; errors: string[] }> => {
  const { date, projectId, centerId, semesterId, attendances } = request;
  const errors: string[] = [];
  let processedCount = 0;

  for (const attendanceData of attendances) {
    try {
      await markAttendance(
        {
          userId: attendanceData.userId,
          date,
          status: attendanceData.status,
          roleAssignmentId: attendanceData.roleAssignmentId,
          projectId,
          centerId,
          semesterId,
          notes: attendanceData.notes,
          holidayReason: attendanceData.holidayReason,
        },
        markedBy
      );
      processedCount++;
    } catch (error: any) {
      errors.push(`User ${attendanceData.userId}: ${error.message}`);
    }
  }

  return {
    message: `Bulk attendance marking completed. Processed ${processedCount}/${attendances.length} records.`,
    processedCount,
    errors,
  };
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
      whereClause.date.gte = new Date(startDate);
    }
    if (endDate) {
      whereClause.date.lte = new Date(endDate);
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
      gte: new Date(startDate),
      lte: new Date(endDate),
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
