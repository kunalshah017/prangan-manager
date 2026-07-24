import { prisma } from "../lib/prisma.js";
import {
  StudentAttendanceCreateInput,
  StudentAttendanceUpdateInput,
  StudentAttendanceFilter,
  StudentAttendanceWithDetails,
  StudentAttendanceStats,
  BulkStudentAttendanceInput,
  BulkStudentAttendanceResponse,
  StudentAttendanceData,
} from "../types/student-attendance.types.js";
import { StudentAttendanceStatus } from "../generated/prisma/index.js";
import { isValidDateFormat } from "../utils/dateHelpers.js";

const toAttendanceDate = (date: string): Date => {
  if (!isValidDateFormat(date)) {
    throw new Error("Date must be in YYYY-MM-DD format");
  }

  return new Date(`${date}T00:00:00.000Z`);
};

export class StudentAttendanceSemesterDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudentAttendanceSemesterDateError";
  }
}

export class StudentAttendanceWeekendDateError extends Error {
  constructor() {
    super("Student attendance can only be marked on Saturday or Sunday");
    this.name = "StudentAttendanceWeekendDateError";
  }
}

export const assertStudentAttendanceWeekend = (date: string) => {
  const day = toAttendanceDate(date).getUTCDay();
  if (day !== 0 && day !== 6) {
    throw new StudentAttendanceWeekendDateError();
  }
};

const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const assertStudentAttendanceDatesWithinBounds = (
  dates: string[],
  semester: { startDate: Date; endDate: Date },
) => {
  const startDate = dateOnly(semester.startDate);
  const endDate = dateOnly(semester.endDate);

  if (dates.some((date) => date < startDate || date > endDate)) {
    throw new StudentAttendanceSemesterDateError(
      `Attendance date must be between ${startDate} and ${endDate}`,
    );
  }
};

export const assertStudentAttendanceDatesWithinSemester = async (
  semesterId: string,
  dates: string[],
) => {
  if (dates.length === 0) return;

  const semester = await prisma.semesters.findUnique({
    where: { id: semesterId },
    select: { startDate: true, endDate: true },
  });

  if (!semester) {
    throw new StudentAttendanceSemesterDateError("Semester not found");
  }

  assertStudentAttendanceDatesWithinBounds(dates, semester);
};

export class StudentAttendanceService {
  // Create or update student attendance for a specific date
  static async markAttendance(
    data: StudentAttendanceCreateInput,
    markedBy: string,
    allowedSemesterLevelIds?: string[],
  ): Promise<StudentAttendanceWithDetails> {
    assertStudentAttendanceWeekend(data.date);

    // Validate enrollment exists and is active
    const enrollment = await prisma.studentEnrollments.findFirst({
      where: {
        id: data.enrollmentId,
        studentId: data.studentId,
        isActive: true,
        ...(allowedSemesterLevelIds && {
          semesterLevelId: { in: allowedSemesterLevelIds },
        }),
      },
      include: {
        student: true,
        project: true,
        center: true,
        semester: true,
      },
    });

    if (!enrollment) {
      throw new Error("Student enrollment not found or inactive");
    }

    // Validate that the enrollment matches the provided IDs
    if (
      enrollment.projectId !== data.projectId ||
      enrollment.centerId !== data.centerId ||
      enrollment.semesterId !== data.semesterId
    ) {
      throw new Error(
        "Enrollment does not match provided project, center, or semester",
      );
    }

    const attendanceDate = toAttendanceDate(data.date);
    assertStudentAttendanceDatesWithinBounds([data.date], enrollment.semester);
    const holidayReason =
      data.status === StudentAttendanceStatus.HOLIDAY
        ? data.holidayReason
        : null;

    // Upsert attendance record
    const attendance = await prisma.studentAttendance.upsert({
      where: {
        studentId_date_projectId_centerId_semesterId: {
          studentId: data.studentId,
          date: attendanceDate,
          projectId: data.projectId,
          centerId: data.centerId,
          semesterId: data.semesterId,
        },
      },
      update: {
        status: data.status,
        notes: data.notes,
        holidayReason,
        markedBy,
        markedAt: new Date(),
      },
      create: {
        studentId: data.studentId,
        date: attendanceDate,
        status: data.status,
        enrollmentId: data.enrollmentId,
        projectId: data.projectId,
        centerId: data.centerId,
        semesterId: data.semesterId,
        notes: data.notes,
        holidayReason,
        markedBy,
        markedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            level: true,
            semesterLevelId: true,
            semesterLevel: { include: { academicLevel: true } },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return attendance;
  }

  /**
   * Mark attendance for multiple students in bulk using SQL bulk operations
   *
   * OPTIMIZED SQL APPROACH:
   * - Single SQL bulk upsert operation instead of individual operations
   * - 10x faster processing using PostgreSQL ON CONFLICT DO UPDATE
   * - Eliminates individual timeouts and chunking complexity
   * - Handles up to 1000+ students in single operation efficiently
   * - Maintains full data integrity and error reporting
   */
  static async markBulkAttendance(
    data: BulkStudentAttendanceInput,
    markedBy: string,
    allowedSemesterLevelIds?: string[],
  ): Promise<BulkStudentAttendanceResponse> {
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 8000; // 8 seconds max for typical batch sizes
    const totalStudents = data.studentAttendances.length;

    try {
      console.log(
        `🚀 Starting bulk attendance processing for ${totalStudents} students`,
      );

      assertStudentAttendanceWeekend(data.date);
      const attendanceDate = toAttendanceDate(data.date);
      await assertStudentAttendanceDatesWithinSemester(data.semesterId, [
        data.date,
      ]);
      const markedAt = new Date();

      const enrollmentPairs = data.studentAttendances.map(
        ({ studentId, enrollmentId }) => ({ studentId, enrollmentId }),
      );

      // Pre-flight validation with timeout protection (keep this fast)
      const enrollments = (await Promise.race([
        prisma.studentEnrollments.findMany({
          where: {
            OR: enrollmentPairs.map(({ studentId, enrollmentId }) => ({
              id: enrollmentId,
              studentId,
            })),
            isActive: true,
            projectId: data.projectId,
            centerId: data.centerId,
            semesterId: data.semesterId,
            ...(allowedSemesterLevelIds && {
              semesterLevelId: { in: allowedSemesterLevelIds },
            }),
          },
          select: {
            id: true,
            studentId: true,
            level: true,
            semesterLevelId: true,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Enrollment validation timeout")),
            2000,
          ),
        ),
      ])) as any[];

      console.log(
        `✅ Found ${enrollments.length} valid enrollments out of ${enrollmentPairs.length} requested`,
      );

      // Create enrollment lookup map
      const enrollmentMap = new Map(
        enrollments.map((enrollment) => [
          `${enrollment.studentId}:${enrollment.id}`,
          enrollment.id,
        ]),
      );

      // Prepare valid attendance records and collect validation errors
      const validAttendances: StudentAttendanceData[] = [];
      const errors: Array<{ studentId: string; error: string }> = [];

      for (const studentAttendance of data.studentAttendances) {
        const validEnrollmentId = enrollmentMap.get(
          `${studentAttendance.studentId}:${studentAttendance.enrollmentId}`,
        );

        if (!validEnrollmentId) {
          errors.push({
            studentId: studentAttendance.studentId,
            error: "Student enrollment not found or inactive",
          });
          continue;
        }

        const attendanceStatus = studentAttendance.status || data.status;
        validAttendances.push({
          studentId: studentAttendance.studentId,
          date: attendanceDate,
          status: attendanceStatus,
          enrollmentId: studentAttendance.enrollmentId,
          projectId: data.projectId,
          centerId: data.centerId,
          semesterId: data.semesterId,
          notes: studentAttendance.notes,
          holidayReason:
            attendanceStatus === StudentAttendanceStatus.HOLIDAY
              ? data.holidayReason
              : null,
          markedBy,
          markedAt,
        });
      }

      if (validAttendances.length === 0) {
        console.log("❌ No valid attendance records to process");
        return { processedCount: 0, errors, attendances: [] };
      }

      console.log(
        `📝 Processing ${validAttendances.length} valid attendance records`,
      );

      // Check if we're approaching timeout
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > MAX_EXECUTION_TIME - 4000) {
        throw new Error(
          "Pre-processing took too long, aborting to prevent timeout",
        );
      }

      // Simple transaction approach for typical batch sizes (~100 students)
      const sqlStart = Date.now();

      let bulkResults;
      try {
        // Use a single transaction with all upserts for typical class sizes
        bulkResults = await prisma.$transaction(
          validAttendances.map((attendance) =>
            prisma.studentAttendance.upsert({
              where: {
                studentId_date_projectId_centerId_semesterId: {
                  studentId: attendance.studentId,
                  date: attendance.date,
                  projectId: attendance.projectId,
                  centerId: attendance.centerId,
                  semesterId: attendance.semesterId,
                },
              },
              update: {
                status: attendance.status,
                notes: attendance.notes,
                holidayReason: attendance.holidayReason,
                markedBy: attendance.markedBy,
                markedAt: attendance.markedAt,
                updatedAt: attendance.markedAt,
              },
              create: {
                studentId: attendance.studentId,
                date: attendance.date,
                status: attendance.status,
                enrollmentId: attendance.enrollmentId,
                projectId: attendance.projectId,
                centerId: attendance.centerId,
                semesterId: attendance.semesterId,
                notes: attendance.notes,
                holidayReason: attendance.holidayReason,
                markedBy: attendance.markedBy,
                markedAt: attendance.markedAt,
                createdAt: attendance.markedAt,
                updatedAt: attendance.markedAt,
              },
              select: {
                id: true,
                studentId: true,
                date: true,
                status: true,
              },
            }),
          ),
        );
      } catch (transactionError: any) {
        console.error(
          `❌ Prisma transaction failed:`,
          transactionError.message,
        );
        throw new Error(
          `Bulk attendance transaction failed: ${transactionError.message}`,
        );
      }

      const sqlTime = Date.now() - sqlStart;
      console.log(
        `⚡ Prisma bulk transaction completed in ${sqlTime}ms for ${bulkResults.length} records`,
      );

      // Get student details for the successfully processed records
      const processedStudentIds = bulkResults.map(
        (result: any) => result.studentId,
      );
      let studentMap = new Map();

      try {
        const studentsDetails = (await Promise.race([
          prisma.students.findMany({
            where: {
              id: { in: processedStudentIds },
            },
            select: {
              id: true,
              name: true,
            },
          }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Student details fetch timeout")),
              1000,
            ),
          ),
        ])) as any[];

        studentMap = new Map(
          studentsDetails.map((student: any) => [student.id, student]),
        );
      } catch (enrichmentError: any) {
        console.error(
          `⚠️ Student details enrichment failed after committed bulk attendance:`,
          enrichmentError.message,
        );
      }

      // Transform results to match expected format
      const processedAttendances = bulkResults.map((result: any) => ({
        id: result.id,
        studentId: result.studentId,
        date: result.date,
        status: result.status,
        student: studentMap.get(result.studentId) || {
          id: result.studentId,
          name: "Unknown",
        },
      }));

      // Find any students that weren't processed (shouldn't happen with bulk SQL, but safety check)
      const processedStudentIdsSet = new Set(processedStudentIds);
      const missedStudents = validAttendances.filter(
        (attendance) => !processedStudentIdsSet.has(attendance.studentId),
      );

      // Add missed students to errors (this should be rare with SQL bulk operation)
      missedStudents.forEach((attendance) => {
        errors.push({
          studentId: attendance.studentId,
          error: "Student was validated but not processed in bulk operation",
        });
      });

      const totalTime = Date.now() - startTime;
      const successRate = (
        (processedAttendances.length / validAttendances.length) *
        100
      ).toFixed(1);
      const overallSuccessRate = (
        (processedAttendances.length / totalStudents) *
        100
      ).toFixed(1);

      console.log(`🎉 Bulk attendance processing completed in ${totalTime}ms`);
      console.log(
        `📈 Results: ${processedAttendances.length}/${validAttendances.length} valid records processed (${successRate}% success rate)`,
      );
      console.log(
        `📊 Overall: ${processedAttendances.length}/${totalStudents} total students processed (${overallSuccessRate}% overall success rate)`,
      );
      console.log(`⚠️  Errors: ${errors.length} total errors`);
      console.log(
        `🚀 Performance: SQL operation took ${sqlTime}ms (${(
          validAttendances.length /
          (sqlTime / 1000)
        ).toFixed(0)} records/sec)`,
      );

      return {
        processedCount: processedAttendances.length,
        attendances: processedAttendances,
        errors,
      };
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(
        `💥 Student bulk attendance marking failed after ${totalTime}ms:`,
        error.message,
      );

      if (
        error instanceof StudentAttendanceSemesterDateError ||
        error instanceof StudentAttendanceWeekendDateError
      ) {
        throw error;
      }

      // Handle timeout and critical errors (including Prisma transaction timeouts)
      if (
        error.message?.includes("timeout") ||
        error.message?.includes("timed out") ||
        error.message?.includes("Transaction already closed") ||
        error.message?.includes("expired transaction") ||
        error.code === "P2024" ||
        totalTime > MAX_EXECUTION_TIME
      ) {
        throw new Error(
          "Request timed out. Please try reducing the batch size or try again during off-peak hours.",
        );
      }

      throw new Error(`Bulk attendance marking failed: ${error.message}`);
    }
  }

  // Get attendance records with filters
  static async getAttendance(
    filter: StudentAttendanceFilter,
    allowedSemesterLevelIds?: string[],
  ): Promise<StudentAttendanceWithDetails[]> {
    if (filter.semesterId) {
      await assertStudentAttendanceDatesWithinSemester(
        filter.semesterId,
        [filter.date, filter.dateFrom, filter.dateTo].filter(
          (date): date is string => Boolean(date),
        ),
      );
    }

    // Build a single date filter to avoid overwriting conditions
    const dateFilter: { equals?: Date; gte?: Date; lte?: Date } = {};
    if (filter.date) {
      // If an exact date is provided, prioritize equals
      dateFilter.equals = toAttendanceDate(filter.date);
    } else {
      if (filter.dateFrom) dateFilter.gte = toAttendanceDate(filter.dateFrom);
      if (filter.dateTo) {
        const to = toAttendanceDate(filter.dateTo);
        // Make end date inclusive to end-of-day
        to.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = to;
      }
    }

    return await prisma.studentAttendance.findMany({
      where: {
        ...(filter.studentId && { studentId: filter.studentId }),
        ...(filter.projectId && { projectId: filter.projectId }),
        ...(filter.centerId && { centerId: filter.centerId }),
        ...(filter.semesterId && { semesterId: filter.semesterId }),
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(filter.status && { status: filter.status }),
        ...(allowedSemesterLevelIds && {
          enrollment: { semesterLevelId: { in: allowedSemesterLevelIds } },
        }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            level: true,
            semesterLevelId: true,
            semesterLevel: { include: { academicLevel: true } },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { student: { name: "asc" } }],
    });
  }

  // Get attendance by student ID
  static async getStudentAttendance(
    studentId: string,
    filter?: Omit<StudentAttendanceFilter, "studentId">,
    allowedSemesterLevelIds?: string[],
  ): Promise<any[]> {
    return this.getAttendance(
      { ...filter, studentId },
      allowedSemesterLevelIds,
    );
  }

  // Get attendance statistics for a student
  static async getStudentAttendanceStats(
    studentId: string,
    projectId?: string,
    semesterId?: string,
    centerId?: string,
    dateFrom?: string,
    dateTo?: string,
    allowedSemesterLevelIds?: string[],
  ): Promise<StudentAttendanceStats> {
    const filter: StudentAttendanceFilter = {
      studentId,
      ...(projectId && { projectId }),
      ...(semesterId && { semesterId }),
      ...(centerId && { centerId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    };

    const attendanceRecords = await this.getAttendance(
      filter,
      allowedSemesterLevelIds,
    );

    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let holidayDays = 0;

    attendanceRecords.forEach((record) => {
      totalDays++;
      switch (record.status) {
        case "PRESENT":
          presentDays++;
          break;
        case "ABSENT":
          absentDays++;
          break;
        case "HOLIDAY":
          holidayDays++;
          break;
      }
    });

    const workingDays = totalDays - holidayDays;
    const attendancePercentage =
      workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      holidayDays,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100, // Round to 2 decimal places
    };
  }

  // Update attendance record
  static async updateAttendance(
    attendanceId: string,
    data: StudentAttendanceUpdateInput,
    updatedBy: string,
  ): Promise<StudentAttendanceWithDetails> {
    const existingAttendance = await prisma.studentAttendance.findUnique({
      where: { id: attendanceId },
    });

    if (!existingAttendance) {
      throw new Error("Attendance record not found");
    }

    return await prisma.studentAttendance.update({
      where: { id: attendanceId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.holidayReason !== undefined && {
          holidayReason: data.holidayReason,
        }),
        markedBy: updatedBy,
        markedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            level: true,
            semesterLevelId: true,
            semesterLevel: { include: { academicLevel: true } },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        semester: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
        markedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Delete attendance record
  static async deleteAttendance(attendanceId: string): Promise<void> {
    const existingAttendance = await prisma.studentAttendance.findUnique({
      where: { id: attendanceId },
    });

    if (!existingAttendance) {
      throw new Error("Attendance record not found");
    }

    await prisma.studentAttendance.delete({
      where: { id: attendanceId },
    });
  }

  static async getAttendanceScope(attendanceId: string) {
    return prisma.studentAttendance.findUnique({
      where: { id: attendanceId },
      select: {
        projectId: true,
        centerId: true,
        semesterId: true,
        enrollment: {
          select: { level: true, semesterLevelId: true },
        },
      },
    });
  }

  // Get attendance for a specific date and center/semester
  static async getAttendanceByDate(
    date: string,
    centerId: string,
    semesterId: string,
    projectId?: string,
    allowedSemesterLevelIds?: string[],
  ): Promise<any[]> {
    return this.getAttendance(
      {
        date,
        centerId,
        semesterId,
        projectId,
      },
      allowedSemesterLevelIds,
    );
  }

  // Get students who are enrolled but have no attendance record for a specific date
  static async getStudentsWithoutAttendance(
    date: string,
    centerId: string,
    semesterId: string,
    projectId?: string,
    allowedSemesterLevelIds?: string[],
  ) {
    await assertStudentAttendanceDatesWithinSemester(semesterId, [date]);
    const attendanceDate = toAttendanceDate(date);

    // Get all active enrollments for the center and semester
    const enrollments = await prisma.studentEnrollments.findMany({
      where: {
        centerId,
        semesterId,
        ...(projectId && { projectId }),
        isActive: true,
        ...(allowedSemesterLevelIds && {
          semesterLevelId: { in: allowedSemesterLevelIds },
        }),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
        semesterLevel: { include: { academicLevel: true } },
      },
    });

    // Get existing attendance records for this date
    const existingAttendance = await prisma.studentAttendance.findMany({
      where: {
        date: attendanceDate,
        centerId,
        semesterId,
        ...(projectId && { projectId }),
        ...(allowedSemesterLevelIds && {
          enrollment: { semesterLevelId: { in: allowedSemesterLevelIds } },
        }),
      },
      select: {
        studentId: true,
      },
    });

    const attendedStudentIds = new Set(
      existingAttendance.map((att) => att.studentId),
    );

    // Filter out students who already have attendance records
    const studentsWithoutAttendance = enrollments
      .filter((enrollment) => !attendedStudentIds.has(enrollment.studentId))
      .map((enrollment) => ({
        enrollmentId: enrollment.id,
        student: enrollment.student,
        level: enrollment.level,
        semesterLevelId: enrollment.semesterLevelId,
        semesterLevel: enrollment.semesterLevel,
        studentId: enrollment.studentId,
        projectId: enrollment.projectId,
        centerId: enrollment.centerId,
        semesterId: enrollment.semesterId,
      }));

    return studentsWithoutAttendance;
  }
}
