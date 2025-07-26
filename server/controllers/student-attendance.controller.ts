import { FastifyRequest, FastifyReply } from "fastify";
import { StudentAttendanceService } from "../service/student-attendance.service.js";
import {
  StudentAttendanceCreateInput,
  StudentAttendanceUpdateInput,
  StudentAttendanceFilter,
  BulkStudentAttendanceInput,
} from "../types/student-attendance.types.js";

// Mark attendance for a single student
export const markStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const attendanceData = request.body as StudentAttendanceCreateInput;

    // Validate required fields
    if (
      !attendanceData.studentId ||
      !attendanceData.date ||
      !attendanceData.enrollmentId
    ) {
      return reply.status(400).send({
        message: "Student ID, date, and enrollment ID are required",
      });
    }

    const attendance = await StudentAttendanceService.markAttendance(
      attendanceData,
      userId
    );

    return reply.status(200).send({
      message: "Student attendance marked successfully",
      attendance,
    });
  } catch (error: any) {
    console.error("Error marking student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to mark student attendance",
    });
  }
};

// Mark attendance for multiple students in bulk
export const markBulkStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const bulkData = request.body as BulkStudentAttendanceInput;

    // Validate required fields
    if (!bulkData.date || !bulkData.studentAttendances?.length) {
      return reply.status(400).send({
        message: "Date and student attendances array are required",
      });
    }

    const attendances = await StudentAttendanceService.markBulkAttendance(
      bulkData,
      userId
    );

    return reply.status(200).send({
      message: "Bulk student attendance marked successfully",
      attendances,
      processed: attendances.length,
      total: bulkData.studentAttendances.length,
    });
  } catch (error: any) {
    console.error("Error marking bulk student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to mark bulk student attendance",
    });
  }
};

// Get attendance records with filters
export const getStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const filter = request.query as StudentAttendanceFilter;

    const attendance = await StudentAttendanceService.getAttendance(filter);

    return reply.status(200).send({
      message: "Student attendance retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    console.error("Error getting student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get student attendance",
    });
  }
};

// Get attendance for a specific student
export const getStudentAttendanceById = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { studentId } = request.params as { studentId: string };
    const filter = request.query as Omit<StudentAttendanceFilter, "studentId">;

    const attendance = await StudentAttendanceService.getStudentAttendance(
      studentId,
      filter
    );

    return reply.status(200).send({
      message: "Student attendance retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    console.error("Error getting student attendance by ID:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get student attendance",
    });
  }
};

// Get attendance statistics for a student
export const getStudentAttendanceStats = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { studentId } = request.params as { studentId: string };
    const { semesterId, centerId, dateFrom, dateTo } = request.query as {
      semesterId?: string;
      centerId?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    const stats = await StudentAttendanceService.getStudentAttendanceStats(
      studentId,
      semesterId,
      centerId,
      dateFrom,
      dateTo
    );

    return reply.status(200).send({
      message: "Student attendance statistics retrieved successfully",
      stats,
    });
  } catch (error: any) {
    console.error("Error getting student attendance stats:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get student attendance statistics",
    });
  }
};

// Update attendance record
export const updateStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ message: "Unauthorized" });
    }

    const { attendanceId } = request.params as { attendanceId: string };
    const updateData = request.body as StudentAttendanceUpdateInput;

    const attendance = await StudentAttendanceService.updateAttendance(
      attendanceId,
      updateData,
      userId
    );

    return reply.status(200).send({
      message: "Student attendance updated successfully",
      attendance,
    });
  } catch (error: any) {
    console.error("Error updating student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to update student attendance",
    });
  }
};

// Delete attendance record
export const deleteStudentAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { attendanceId } = request.params as { attendanceId: string };

    await StudentAttendanceService.deleteAttendance(attendanceId);

    return reply.status(200).send({
      message: "Student attendance deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting student attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to delete student attendance",
    });
  }
};

// Get attendance for a specific date and center/semester
export const getAttendanceByDate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { date, centerId, semesterId, projectId } = request.query as {
      date: string;
      centerId: string;
      semesterId: string;
      projectId?: string;
    };

    if (!date || !centerId || !semesterId) {
      return reply.status(400).send({
        message: "Date, center ID, and semester ID are required",
      });
    }

    const attendance = await StudentAttendanceService.getAttendanceByDate(
      date,
      centerId,
      semesterId,
      projectId
    );

    return reply.status(200).send({
      message: "Attendance by date retrieved successfully",
      attendance,
      count: attendance.length,
    });
  } catch (error: any) {
    console.error("Error getting attendance by date:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get attendance by date",
    });
  }
};

// Get students without attendance for a specific date
export const getStudentsWithoutAttendance = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { date, centerId, semesterId, projectId } = request.query as {
      date: string;
      centerId: string;
      semesterId: string;
      projectId?: string;
    };

    if (!date || !centerId || !semesterId) {
      return reply.status(400).send({
        message: "Date, center ID, and semester ID are required",
      });
    }

    const students =
      await StudentAttendanceService.getStudentsWithoutAttendance(
        date,
        centerId,
        semesterId,
        projectId
      );

    return reply.status(200).send({
      message: "Students without attendance retrieved successfully",
      students,
      count: students.length,
    });
  } catch (error: any) {
    console.error("Error getting students without attendance:", error);
    return reply.status(500).send({
      message: error.message || "Failed to get students without attendance",
    });
  }
};
