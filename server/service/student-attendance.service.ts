import { PrismaClient } from "../generated/prisma/index.js";
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

const prisma = new PrismaClient();

export class StudentAttendanceService {
  // Create or update student attendance for a specific date
  static async markAttendance(
    data: StudentAttendanceCreateInput,
    markedBy: string
  ): Promise<StudentAttendanceWithDetails> {
    // Validate enrollment exists and is active
    const enrollment = await prisma.studentEnrollments.findFirst({
      where: {
        id: data.enrollmentId,
        studentId: data.studentId,
        isActive: true,
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
        "Enrollment does not match provided project, center, or semester"
      );
    }

    const attendanceDate = new Date(data.date);

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
        holidayReason: data.holidayReason,
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
        holidayReason: data.holidayReason,
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
   * Mark attendance for multiple students in bulk
   *
   * PERFORMANCE OPTIMIZATIONS FOR SERVERLESS:
   * - Batch validation of enrollments in single query
   * - Uses transaction for small batches (≤15 students) with 8s timeout
   * - Uses non-transactional approach for larger batches (16+ students)
   * - Processes in optimized batch sizes (8 for transactions, 12 for non-transactional)
   * - Individual error handling to allow partial success
   * - Pre-validates all data to fail fast on validation errors
   */
  static async markBulkAttendance(
    data: BulkStudentAttendanceInput,
    markedBy: string
  ): Promise<BulkStudentAttendanceResponse> {
    try {
      const attendanceDate = new Date(data.date);

      // Extract all student and enrollment IDs for batch validation
      const studentIds = data.studentAttendances.map((sa) => sa.studentId);
      const enrollmentIds = data.studentAttendances.map(
        (sa) => sa.enrollmentId
      );

      // Batch validate all enrollments in a single query
      const enrollments = await prisma.studentEnrollments.findMany({
        where: {
          id: { in: enrollmentIds },
          studentId: { in: studentIds },
          isActive: true,
          projectId: data.projectId,
          centerId: data.centerId,
          semesterId: data.semesterId,
        },
        select: {
          id: true,
          studentId: true,
          projectId: true,
          centerId: true,
          semesterId: true,
        },
      });

      // Create a map for quick enrollment lookup
      const enrollmentMap = new Map(
        enrollments.map((e) => [`${e.studentId}-${e.id}`, e])
      );

      // Prepare bulk operations
      const validAttendances: StudentAttendanceData[] = [];
      const errors: Array<{ studentId: string; error: string }> = [];

      for (const studentAttendance of data.studentAttendances) {
        const enrollmentKey = `${studentAttendance.studentId}-${studentAttendance.enrollmentId}`;
        const enrollment = enrollmentMap.get(enrollmentKey);

        if (!enrollment) {
          errors.push({
            studentId: studentAttendance.studentId,
            error: "Invalid or inactive enrollment",
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
            attendanceStatus === "HOLIDAY" ? data.holidayReason : null,
          markedBy,
          markedAt: new Date(),
        });
      }

      if (validAttendances.length === 0) {
        return { processedCount: 0, errors, attendances: [] };
      }

      // Optimized approach for serverless environments (Vercel has 10s limit)
      // Use transaction for smaller batches, non-transactional for larger ones
      const useTransaction = validAttendances.length <= 15; // Reduced threshold for faster processing

      if (useTransaction) {
        // Use transaction for bulk operations with serverless-friendly timeout
        const results = await prisma.$transaction(
          async (tx) => {
            const attendanceResults = [];

            // Process in smaller batches to avoid query limits and reduce transaction time
            const batchSize = 8; // Optimized batch size for faster processing
            for (let i = 0; i < validAttendances.length; i += batchSize) {
              const batch = validAttendances.slice(i, i + batchSize);

              // For each item in batch, use upsert
              const batchPromises = batch.map((attendance) =>
                tx.studentAttendance.upsert({
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
                  create: attendance,
                  select: {
                    id: true,
                    studentId: true,
                    date: true,
                    status: true,
                    student: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                })
              );

              const batchResults = await Promise.all(batchPromises);
              attendanceResults.push(...batchResults);
            }

            return attendanceResults;
          },
          {
            timeout: 8000, // 8 second timeout to stay under Vercel's 10s limit
          }
        );

        return {
          processedCount: results.length,
          errors,
          attendances: results,
        };
      } else {
        // Non-transactional approach for larger batches (16+ students)
        // Better for serverless environments with large datasets
        const attendanceResults = [];
        const processingErrors = [...errors]; // Start with validation errors

        // Process in optimized batches without transaction for better performance
        const batchSize = 12; // Optimized for serverless performance
        for (let i = 0; i < validAttendances.length; i += batchSize) {
          const batch = validAttendances.slice(i, i + batchSize);

          // Process batch with error handling for each item
          const batchPromises = batch.map(async (attendance) => {
            try {
              const result = await prisma.studentAttendance.upsert({
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
                create: attendance,
                select: {
                  id: true,
                  studentId: true,
                  date: true,
                  status: true,
                  student: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              });
              return result;
            } catch (error: any) {
              console.error(
                `Error processing student attendance for ${attendance.studentId}:`,
                error
              );
              processingErrors.push({
                studentId: attendance.studentId,
                error: error.message || "Failed to process attendance",
              });
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          attendanceResults.push(
            ...batchResults.filter((result) => result !== null)
          );
        }

        return {
          processedCount: attendanceResults.length,
          errors: processingErrors,
          attendances: attendanceResults,
        };
      }
    } catch (error: any) {
      console.error("Student bulk attendance marking failed:", error);

      // Handle timeout and other critical errors
      if (error.message?.includes("timeout") || error.code === "P2024") {
        throw new Error(
          "Request timed out. Please try processing fewer students at once."
        );
      }

      throw new Error(`Bulk attendance marking failed: ${error.message}`);
    }
  }

  // Get attendance records with filters
  static async getAttendance(
    filter: StudentAttendanceFilter
  ): Promise<StudentAttendanceWithDetails[]> {
    // Build a single date filter to avoid overwriting conditions
    const dateFilter: { equals?: Date; gte?: Date; lte?: Date } = {};
    if (filter.date) {
      // If an exact date is provided, prioritize equals
      dateFilter.equals = new Date(filter.date);
    } else {
      if (filter.dateFrom) dateFilter.gte = new Date(filter.dateFrom);
      if (filter.dateTo) {
        const to = new Date(filter.dateTo);
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
    filter?: Omit<StudentAttendanceFilter, "studentId">
  ): Promise<any[]> {
    return this.getAttendance({ ...filter, studentId });
  }

  // Get attendance statistics for a student
  static async getStudentAttendanceStats(
    studentId: string,
    semesterId?: string,
    centerId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<StudentAttendanceStats> {
    const filter: StudentAttendanceFilter = {
      studentId,
      ...(semesterId && { semesterId }),
      ...(centerId && { centerId }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
    };

    const attendanceRecords = await this.getAttendance(filter);

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
    updatedBy: string
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
        ...data,
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

  // Get attendance for a specific date and center/semester
  static async getAttendanceByDate(
    date: string,
    centerId: string,
    semesterId: string,
    projectId?: string
  ): Promise<any[]> {
    return this.getAttendance({
      date,
      centerId,
      semesterId,
      projectId,
    });
  }

  // Get students who are enrolled but have no attendance record for a specific date
  static async getStudentsWithoutAttendance(
    date: string,
    centerId: string,
    semesterId: string,
    projectId?: string
  ) {
    const attendanceDate = new Date(date);

    // Get all active enrollments for the center and semester
    const enrollments = await prisma.studentEnrollments.findMany({
      where: {
        centerId,
        semesterId,
        ...(projectId && { projectId }),
        isActive: true,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // Get existing attendance records for this date
    const existingAttendance = await prisma.studentAttendance.findMany({
      where: {
        date: attendanceDate,
        centerId,
        semesterId,
        ...(projectId && { projectId }),
      },
      select: {
        studentId: true,
      },
    });

    const attendedStudentIds = new Set(
      existingAttendance.map((att) => att.studentId)
    );

    // Filter out students who already have attendance records
    const studentsWithoutAttendance = enrollments
      .filter((enrollment) => !attendedStudentIds.has(enrollment.studentId))
      .map((enrollment) => ({
        enrollmentId: enrollment.id,
        student: enrollment.student,
        level: enrollment.level,
        studentId: enrollment.studentId,
        projectId: enrollment.projectId,
        centerId: enrollment.centerId,
        semesterId: enrollment.semesterId,
      }));

    return studentsWithoutAttendance;
  }
}
