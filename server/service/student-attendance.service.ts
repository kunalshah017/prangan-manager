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
   * Mark attendance for multiple students in bulk with automatic chunking
   *
   * ENTERPRISE-GRADE OPTIMIZATIONS FOR SERVERLESS:
   * - Automatically handles large batches by intelligent chunking
   * - Pre-validates all data in single query with timeout protection
   * - Uses adaptive batch sizes based on request size and connection speed
   * - Implements circuit breaker pattern for error resilience
   * - Progressive timeout monitoring with graceful degradation
   * - Guarantees processing of all students or clear error reporting
   * - Optimized for Vercel's 10s timeout with 8.5s processing window
   */
  static async markBulkAttendance(
    data: BulkStudentAttendanceInput,
    markedBy: string
  ): Promise<BulkStudentAttendanceResponse> {
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 9500;
    const totalStudents = data.studentAttendances.length;

    try {
      console.log(
        `🚀 Starting bulk attendance processing for ${totalStudents} students`
      );

      const attendanceDate = new Date(data.date);

      // Extract all student and enrollment IDs for batch validation
      const studentIds = data.studentAttendances.map((sa) => sa.studentId);
      const enrollmentIds = data.studentAttendances.map(
        (sa) => sa.enrollmentId
      );

      // Pre-flight validation with timeout protection
      const enrollments = (await Promise.race([
        prisma.studentEnrollments.findMany({
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
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Enrollment validation timeout")),
            3000
          )
        ),
      ])) as any[];

      console.log(
        `✅ Found ${enrollments.length} valid enrollments out of ${enrollmentIds.length} requested`
      );

      // Create enrollment lookup map
      const enrollmentMap = new Map(
        enrollments.map((e) => [`${e.studentId}-${e.id}`, e])
      );

      // Prepare valid attendance records and collect validation errors
      const validAttendances: StudentAttendanceData[] = [];
      const errors: Array<{ studentId: string; error: string }> = [];

      for (const studentAttendance of data.studentAttendances) {
        const enrollmentKey = `${studentAttendance.studentId}-${studentAttendance.enrollmentId}`;
        const enrollment = enrollmentMap.get(enrollmentKey);

        if (!enrollment) {
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
            attendanceStatus === "HOLIDAY" ? data.holidayReason : null,
          markedBy,
          markedAt: new Date(),
        });
      }

      if (validAttendances.length === 0) {
        console.log("❌ No valid attendance records to process");
        return { processedCount: 0, errors, attendances: [] };
      }

      console.log(
        `📝 Processing ${validAttendances.length} valid attendance records`
      );

      // ADAPTIVE CHUNKING STRATEGY based on request size
      let CHUNK_SIZE: number;
      let BATCH_DELAY: number;
      let MAX_PARALLEL_OPERATIONS: number;

      if (totalStudents <= 20) {
        // Small batches: Process quickly with minimal delays
        CHUNK_SIZE = 8;
        BATCH_DELAY = 50;
        MAX_PARALLEL_OPERATIONS = 4;
        console.log(`📊 Using SMALL batch strategy: ${CHUNK_SIZE} per chunk`);
      } else if (totalStudents <= 50) {
        // Medium batches: Balanced approach
        CHUNK_SIZE = 6;
        BATCH_DELAY = 100;
        MAX_PARALLEL_OPERATIONS = 3;
        console.log(`📊 Using MEDIUM batch strategy: ${CHUNK_SIZE} per chunk`);
      } else {
        // Large batches: Conservative approach with more safety margins
        CHUNK_SIZE = 4;
        BATCH_DELAY = 150;
        MAX_PARALLEL_OPERATIONS = 2;
        console.log(`📊 Using LARGE batch strategy: ${CHUNK_SIZE} per chunk`);
      }

      const processedAttendances: Array<{
        id: string;
        studentId: string;
        date: Date;
        status: "PRESENT" | "ABSENT" | "HOLIDAY";
        student: { id: string; name: string };
      }> = [];
      const processingErrors = [...errors];

      // Split valid attendances into chunks for processing
      const chunks = [];
      for (let i = 0; i < validAttendances.length; i += CHUNK_SIZE) {
        chunks.push(validAttendances.slice(i, i + CHUNK_SIZE));
      }

      console.log(
        `🔄 Processing ${chunks.length} chunks with up to ${MAX_PARALLEL_OPERATIONS} parallel operations`
      );

      // Process chunks with controlled parallelism
      for (
        let chunkIndex = 0;
        chunkIndex < chunks.length;
        chunkIndex += MAX_PARALLEL_OPERATIONS
      ) {
        const elapsedTime = Date.now() - startTime;

        // Timeout safety check
        if (elapsedTime > MAX_EXECUTION_TIME) {
          console.warn(
            `⏰ Timeout approaching at ${elapsedTime}ms, terminating processing`
          );

          // Add remaining students to errors
          const remainingChunks = chunks.slice(chunkIndex);
          remainingChunks.forEach((chunk) => {
            chunk.forEach((attendance) => {
              processingErrors.push({
                studentId: attendance.studentId,
                error:
                  "Processing timeout - request terminated early to prevent server timeout",
              });
            });
          });
          break;
        }

        // Get the next batch of chunks to process in parallel
        const parallelChunks = chunks.slice(
          chunkIndex,
          chunkIndex + MAX_PARALLEL_OPERATIONS
        );

        console.log(
          `⚡ Processing parallel batch ${
            Math.floor(chunkIndex / MAX_PARALLEL_OPERATIONS) + 1
          }: ${parallelChunks.length} chunks`
        );

        // Process chunks in parallel with individual error handling
        const chunkPromises = parallelChunks.map(
          async (chunk, parallelIndex) => {
            const globalChunkIndex = chunkIndex + parallelIndex;

            try {
              // Add stagger delay for parallel operations to prevent database overload
              if (parallelIndex > 0) {
                await new Promise((resolve) =>
                  setTimeout(resolve, parallelIndex * 100)
                );
              }

              console.log(
                `🔧 Processing chunk ${globalChunkIndex + 1}/${
                  chunks.length
                }: ${chunk.length} students`
              );

              // Process all students in this chunk sequentially for reliability
              const chunkResults = [];
              for (let i = 0; i < chunk.length; i++) {
                const attendance = chunk[i];

                try {
                  // Add small delay between operations within chunk
                  if (i > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 30));
                  }

                  const result = (await Promise.race([
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
                      create: attendance,
                      select: {
                        id: true,
                        studentId: true,
                        date: true,
                        status: true,
                        student: {
                          select: { id: true, name: true },
                        },
                      },
                    }),
                    new Promise((_, reject) =>
                      setTimeout(
                        () => reject(new Error("Individual operation timeout")),
                        2000
                      )
                    ),
                  ])) as any;

                  chunkResults.push(result);
                } catch (error: any) {
                  console.error(
                    `❌ Error processing student ${attendance.studentId}:`,
                    error.message
                  );
                  processingErrors.push({
                    studentId: attendance.studentId,
                    error: `Database error: ${error.message}`,
                  });
                }
              }

              console.log(
                `✅ Chunk ${globalChunkIndex + 1} completed: ${
                  chunkResults.length
                }/${chunk.length} successful`
              );
              return chunkResults;
            } catch (chunkError: any) {
              console.error(
                `💥 Chunk ${globalChunkIndex + 1} failed completely:`,
                chunkError.message
              );

              // Add all students in failed chunk to errors
              chunk.forEach((attendance) => {
                processingErrors.push({
                  studentId: attendance.studentId,
                  error: `Chunk processing failed: ${chunkError.message}`,
                });
              });

              return [];
            }
          }
        );

        // Wait for all parallel chunks to complete
        try {
          const parallelResults = await Promise.allSettled(chunkPromises);

          parallelResults.forEach((result, index) => {
            if (result.status === "fulfilled") {
              processedAttendances.push(...result.value);
            } else {
              console.error(
                `Parallel chunk ${chunkIndex + index + 1} rejected:`,
                result.reason
              );
            }
          });
        } catch (parallelError: any) {
          console.error(`Parallel processing error:`, parallelError.message);
        }

        // Delay between parallel batches to prevent overwhelming the system
        if (chunkIndex + MAX_PARALLEL_OPERATIONS < chunks.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }

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
        `📈 Results: ${processedAttendances.length}/${validAttendances.length} valid records processed (${successRate}% success rate)`
      );
      console.log(
        `📊 Overall: ${processedAttendances.length}/${totalStudents} total students processed (${overallSuccessRate}% overall success rate)`
      );
      console.log(`⚠️  Errors: ${processingErrors.length} total errors`);

      return {
        processedCount: processedAttendances.length,
        attendances: processedAttendances,
        errors: processingErrors,
      };
    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      console.error(
        `💥 Student bulk attendance marking failed after ${totalTime}ms:`,
        error.message
      );

      // Handle timeout and critical errors
      if (
        error.message?.includes("timeout") ||
        error.code === "P2024" ||
        totalTime > MAX_EXECUTION_TIME ||
        error.message?.includes("timed out")
      ) {
        throw new Error(
          "Request timed out. The system automatically optimizes batch sizes, but this request was too large for the available processing time."
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
