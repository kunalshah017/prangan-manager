// Base Entity Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "APPROVED" | "REJECTED";
  phone?: string;
  qualification?: string;
  address?: string;
  dob?: string;
  profileImageUrl?: string;
  reimbursementAmount?: number;
  // Optional bank details
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  upiId?: string | null;
  createdAt: string;
  updatedAt: string;
  roleAssignments?: {
    id: string;
    subRole:
      | "TRAINING_DEVELOPMENT"
      | "RECRUITMENT"
      | "GROWTH_DEVELOPMENT"
      | "CURRICULUM_MENTOR"
      | "TECH"
      | "CENTER_MANAGER"
      | "EDUCATOR";
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    level?:
      | "LEVEL_1"
      | "LEVEL_2"
      | "LEVEL_3"
      | "LEVEL_4"
      | "PRIMARY_A"
      | "PRIMARY_B";
    committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
    isActive: boolean;
  }[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
  projectType?: string;
  imageUrl?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Center {
  id: string;
  name: string;
  address: string;
  projectId?: string;
  project?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  centerId: string;
  center?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  profileImageUrl?: string;
  dob?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  alternateNumber?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  schoolName?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  familyIncome?: string;
  createdAt: string;
  updatedAt: string;
  // Level is now available through enrollments
  level?:
    | "LEVEL_1"
    | "LEVEL_2"
    | "LEVEL_3"
    | "LEVEL_4"
    | "PRIMARY_A"
    | "PRIMARY_B";
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  centerId: string;
  semesterId: string;
  projectId: string;
  level:
    | "LEVEL_1"
    | "LEVEL_2"
    | "LEVEL_3"
    | "LEVEL_4"
    | "PRIMARY_A"
    | "PRIMARY_B";
  isActive: boolean;
  enrolledAt: string;
  promotedAt?: string;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  center?: {
    id: string;
    name: string;
    address?: string;
  };
  project?: {
    id: string;
    name: string;
    projectType?: string;
  };
  semester?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

// Generic API Response Types
export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
}

export interface ListResponse<T> {
  [key: string]: T[];
}

export interface SingleResponse<T> {
  [key: string]: T;
}

// Generic helper types for CRUD operations
export type CreateRequest<T, K extends keyof T = keyof T> = Pick<T, K>;
export type UpdateRequest<T, K extends keyof T = keyof T> = Partial<Pick<T, K>>;

// Generic response types
export type EntityResponse<T, K extends string> = ApiResponse<T> & Record<K, T>;
export type EntityListResponse<T, K extends string> = ListResponse<T> &
  Record<K, T[]>;

// Message response type
export interface MessageResponse extends ApiResponse<null> {
  message: string;
}

// Auth API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends ApiResponse<{ token: string }> {
  token: string;
}

export type RegisterRequest = Pick<
  User,
  | "email"
  | "name"
  | "phone"
  | "qualification"
  | "address"
  | "dob"
  | "profileImageUrl"
>;

export type RegisterResponse = ApiResponse<null>;

export interface UserDetailsResponse extends ApiResponse<User> {
  user: User;
}

// Project API Types
export type CreateProjectRequest = CreateRequest<
  Project,
  "name" | "description" | "metadata" | "projectType" | "imageUrl"
>;
export type UpdateProjectRequest = UpdateRequest<
  Project,
  "name" | "description" | "status" | "metadata" | "projectType" | "imageUrl"
>;
export type CreateProjectResponse = EntityResponse<Project, "project">;
export type ProjectsResponse = EntityListResponse<Project, "projects">;
export type ProjectResponse = EntityResponse<Project, "project">;
export type UpdateProjectResponse = EntityResponse<Project, "project">;

// Center API Types
export type CreateCenterRequest = CreateRequest<
  Center,
  "name" | "address" | "projectId" | "metadata"
>;
export type UpdateCenterRequest = UpdateRequest<
  Center,
  "name" | "address" | "metadata"
>;
export type CreateCenterResponse = EntityResponse<Center, "center">;
export type CentersResponse = EntityListResponse<Center, "centers">;
export type CenterResponse = EntityResponse<Center, "center">;
export type UpdateCenterResponse = EntityResponse<Center, "center">;

// Semester API Types
export type CreateSemesterRequest = CreateRequest<
  Semester,
  "name" | "startDate" | "endDate"
> & {
  centerId?: string; // Made optional since README doesn't show it in request
};
export type UpdateSemesterRequest = UpdateRequest<
  Semester,
  "name" | "startDate" | "endDate"
>;
export type CreateSemesterResponse = EntityResponse<Semester, "semester">;
export type SemestersResponse = EntityListResponse<Semester, "semesters">;
export type SemesterResponse = EntityResponse<Semester, "semester">;
export type UpdateSemesterResponse = EntityResponse<Semester, "semester">;

// User Management API Types
export type UsersResponse = EntityListResponse<User, "users">;

// Role Assignment Types
export interface RoleAssignment {
  subRole:
    | "TRAINING_DEVELOPMENT"
    | "RECRUITMENT"
    | "GROWTH_DEVELOPMENT"
    | "CURRICULUM_MENTOR"
    | "TECH"
    | "CENTER_MANAGER"
    | "EDUCATOR";
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  level?:
    | "LEVEL_1"
    | "LEVEL_2"
    | "LEVEL_3"
    | "LEVEL_4"
    | "PRIMARY_A"
    | "PRIMARY_B";
  committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
}

// Registration Requests API Types
export type RegistrationRequestsResponse = EntityListResponse<User, "users">;
export type VerifyUserRequest = {
  userId: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  role: "USER" | "ADMIN";
  email: string;
  name: string;
  roleAssignments?: RoleAssignment[];
  rejectionReason?: string;
};
export type VerifyUserResponse = MessageResponse;

// Student API Types
export interface StudentEnrollmentData {
  centerId?: string;
  semesterId?: string;
  projectId?: string;
  level?:
    | "LEVEL_1"
    | "LEVEL_2"
    | "LEVEL_3"
    | "LEVEL_4"
    | "PRIMARY_A"
    | "PRIMARY_B";
}

export type CreateStudentRequest = CreateRequest<
  Student,
  | "name"
  | "profileImageUrl"
  | "dob"
  | "phoneNumber"
  | "whatsappNumber"
  | "alternateNumber"
  | "fatherName"
  | "motherName"
  | "address"
  | "schoolName"
  | "fatherOccupation"
  | "motherOccupation"
  | "familyIncome"
> & {
  enrollment?: StudentEnrollmentData;
};

export type UpdateStudentRequest = UpdateRequest<
  Student,
  | "name"
  | "profileImageUrl"
  | "dob"
  | "phoneNumber"
  | "whatsappNumber"
  | "alternateNumber"
  | "fatherName"
  | "motherName"
  | "address"
  | "schoolName"
  | "fatherOccupation"
  | "motherOccupation"
  | "familyIncome"
> & {
  enrollment?: StudentEnrollmentData;
};

export interface CreateStudentResponse
  extends EntityResponse<Student, "student"> {
  enrollment?: StudentEnrollment;
}

export type StudentsResponse = EntityListResponse<Student, "students">;
export type StudentResponse = EntityResponse<Student, "student">;

export interface UpdateStudentResponse
  extends EntityResponse<Student, "student"> {
  enrollment?: StudentEnrollment;
}

// Student Enrollment API Types
export type StudentEnrollmentsResponse = {
  message: string;
  enrollments: StudentEnrollment[];
};

// Attendance API Types
export interface AttendanceUser {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  roleAssignments: {
    id: string;
    subRole: "CENTER_MANAGER" | "EDUCATOR";
    level?:
      | "LEVEL_1"
      | "LEVEL_2"
      | "LEVEL_3"
      | "LEVEL_4"
      | "PRIMARY_A"
      | "PRIMARY_B";
    committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
    isActive: boolean;
  }[];
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";
  roleAssignmentId: string;
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
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
  };
  roleAssignment?: {
    id: string;
    subRole: "CENTER_MANAGER" | "EDUCATOR";
    level?:
      | "LEVEL_1"
      | "LEVEL_2"
      | "LEVEL_3"
      | "LEVEL_4"
      | "PRIMARY_A"
      | "PRIMARY_B";
    committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
  };
}

// Student Attendance Types
export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  enrollmentId: string;
  projectId: string;
  projectName: string;
  centerId: string;
  centerName: string;
  semesterId: string;
  semesterName: string;
  notes?: string;
  holidayReason?: string;
  markedBy?: string;
  markedAt?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name: string;
    profileImageUrl?: string;
  };
  enrollment?: {
    id: string;
    level:
      | "LEVEL_1"
      | "LEVEL_2"
      | "LEVEL_3"
      | "LEVEL_4"
      | "PRIMARY_A"
      | "PRIMARY_B";
  };
  project?: {
    id: string;
    name: string;
  };
  center?: {
    id: string;
    name: string;
    address?: string;
  };
  semester?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  markedByUser?: {
    id: string;
    name: string;
  };
}

export interface ActiveUsersResponse {
  message: string;
  data: {
    users: AttendanceUser[];
    totalUsers: number;
  };
}

export interface MarkAttendanceRequest {
  userId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";
  roleAssignmentId: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  notes?: string;
  holidayReason?: string;
}

export interface BulkMarkAttendanceRequest {
  date: string;
  attendances: {
    userId: string;
    status: "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";
    roleAssignmentId: string;
    notes?: string;
    holidayReason?: string;
  }[];
  projectId: string;
  centerId: string;
  semesterId: string;
}

// Student Attendance Request Types
export interface MarkStudentAttendanceRequest {
  studentId: string;
  enrollmentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  projectId: string;
  centerId: string;
  semesterId: string;
  notes?: string;
  holidayReason?: string;
}

export interface BulkMarkStudentAttendanceRequest {
  date: string;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  projectId: string;
  centerId: string;
  semesterId: string;
  studentAttendances: {
    studentId: string;
    enrollmentId: string;
    status: "PRESENT" | "ABSENT" | "HOLIDAY";
    notes?: string;
  }[];
  holidayReason?: string;
}

export interface MarkAttendanceResponse {
  message: string;
  attendance: AttendanceRecord;
}

export interface BulkMarkAttendanceResponse {
  message: string;
  errors: string[];
}

// Student Attendance Response Types
export interface MarkStudentAttendanceResponse {
  message: string;
  attendance: StudentAttendanceRecord;
}

export interface BulkMarkStudentAttendanceResponse {
  message: string;
  attendances: StudentAttendanceRecord[];
  processed: number;
  total: number;
}

export interface StudentAttendanceRecordsResponse {
  message: string;
  attendance: StudentAttendanceRecord[];
}

// Students by semester response
export interface StudentsBySemesterResponse {
  message: string;
  enrollments: (StudentEnrollment & {
    student: Student;
    center: {
      id: string;
      name: string;
      address: string;
    };
    project: {
      id: string;
      name: string;
      projectType?: string;
    };
  })[];
}

export interface AttendanceRecordsResponse {
  message: string;
  data: {
    attendances: AttendanceRecord[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Generic Response Types
export interface MessageResponse extends ApiResponse<null> {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}
