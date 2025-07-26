import { PrismaClient } from "../generated/prisma/index.js";
import {
  StudentAttendanceCreateInput,
  StudentAttendanceUpdateInput,
  StudentAttendanceFilter,
  StudentAttendanceWithDetails,
  StudentAttendanceStats,
  BulkStudentAttendanceInput,
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

  // Mark attendance for multiple students in bulk
  static async markBulkAttendance(
    data: BulkStudentAttendanceInput,
    markedBy: string
  ): Promise<any[]> {
    const results = [];

    for (const studentAttendance of data.studentAttendances) {
      const attendanceStatus = studentAttendance.status || data.status;

      const attendanceData: StudentAttendanceCreateInput = {
        studentId: studentAttendance.studentId,
        date: data.date,
        status: attendanceStatus,
        enrollmentId: studentAttendance.enrollmentId,
        projectId: data.projectId,
        centerId: data.centerId,
        semesterId: data.semesterId,
        notes: studentAttendance.notes,
        holidayReason:
          attendanceStatus === "HOLIDAY" ? data.holidayReason : undefined,
      };

      try {
        const result = await this.markAttendance(attendanceData, markedBy);
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to mark attendance for student ${studentAttendance.studentId}:`,
          error
        );
      }
    }

    return results;
  }

  // Get attendance records with filters
  static async getAttendance(
    filter: StudentAttendanceFilter
  ): Promise<StudentAttendanceWithDetails[]> {
    return await prisma.studentAttendance.findMany({
      where: {
        ...(filter.studentId && { studentId: filter.studentId }),
        ...(filter.projectId && { projectId: filter.projectId }),
        ...(filter.centerId && { centerId: filter.centerId }),
        ...(filter.semesterId && { semesterId: filter.semesterId }),
        ...(filter.date && { date: new Date(filter.date) }),
        ...(filter.dateFrom && { date: { gte: new Date(filter.dateFrom) } }),
        ...(filter.dateTo && { date: { lte: new Date(filter.dateTo) } }),
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
