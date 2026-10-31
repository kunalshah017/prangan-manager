import { AttendanceStatus, CommittedDays } from "../generated/prisma/index.js";

export interface AttendanceUser {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  roleAssignments: {
    id: string;
    subRole: string;
    semesterLevelId?: string;
    semesterLevel?: {
      id: string;
      academicLevel: {
        id: string;
        code: string;
        name: string;
        journeyOrder: number;
      };
    };
    committedDays?: CommittedDays;
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    isActive: boolean;
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
  // Only records made under assignments that are still active.
  activeAssignmentsOnly?: boolean;
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
    user: {
      id: string;
      name: string;
      email: string;
      profileImageUrl?: string;
    };
    roleAssignment: {
      id: string;
      subRole: string;
      semesterLevelId?: string;
      semesterLevel?: {
        id: string;
        academicLevel: {
          id: string;
          code: string;
          name: string;
          journeyOrder: number;
        };
      };
      committedDays?: CommittedDays;
    };
  }[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

