import { AttendanceStatus, CommittedDays } from "../generated/prisma/index.js";

export interface AttendanceUser {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  roleAssignments: {
    id: string;
    subRole: string;
    level?: string;
    committedDays?: CommittedDays;
    projectId?: string;
    centerId?: string;
    semesterId?: string;
  }[];
}

export interface GetActiveUsersForAttendanceRequest {
  date: string; // YYYY-MM-DD format
  semesterId: string; // Required
  centerId: string; // Required
  projectId: string;
}

export interface GetActiveUsersForAttendanceResponse {
  users: AttendanceUser[];
  totalUsers: number;
}

export interface MarkAttendanceRequest {
  userId: string;
  date: string; // YYYY-MM-DD format
  status: AttendanceStatus;
  roleAssignmentId: string; // Required - links to specific role assignment
  projectId: string;
  centerId: string; // Required
  semesterId: string; // Required
  notes?: string;
  holidayReason?: string; // Required when status is HOLIDAY
}

export interface MarkBulkAttendanceRequest {
  date: string; // YYYY-MM-DD format
  projectId: string;
  centerId: string; // Required
  semesterId: string; // Required
  attendances: {
    userId: string;
    status: AttendanceStatus;
    roleAssignmentId: string; // Required
    notes?: string;
    holidayReason?: string; // Required when status is HOLIDAY
  }[];
}

export interface MarkAttendanceResponse {
  message: string;
  attendance: {
    id: string;
    userId: string;
    date: string;
    status: AttendanceStatus;
    projectId: string;
    centerId: string;
    semesterId: string;
    notes?: string;
    holidayReason?: string;
    markedBy?: string;
    markedAt?: string;
  };
}

export interface GetAttendanceRequest {
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  userId?: string;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  status?: AttendanceStatus;
  page?: number;
  limit?: number;
}

export interface GetAttendanceResponse {
  attendances: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    date: string;
    status: AttendanceStatus;
    projectId: string;
    projectName: string;
    centerId: string;
    centerName: string;
    semesterId: string;
    semesterName: string;
    notes?: string;
    holidayReason?: string;
    markedBy?: string;
    markedByName?: string;
    markedAt?: string;
    roleAssignment: {
      id: string;
      subRole: string;
      level?: string;
      committedDays?: CommittedDays;
    };
  }[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceSummary {
  userId: string;
  userName: string;
  userEmail: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  notAvailableDays: number;
  holidayDays: number;
  attendancePercentage: number;
}

export interface GetAttendanceSummaryRequest {
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  userIds?: string[];
}

export interface GetAttendanceSummaryResponse {
  summary: AttendanceSummary[];
  periodInfo: {
    startDate: string;
    endDate: string;
    totalDays: number;
    weekendDays: number;
  };
}
