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
  createdAt: string;
  updatedAt: string;
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
  level:
    | "LEVEL_1"
    | "LEVEL_2"
    | "LEVEL_3"
    | "LEVEL_4"
    | "PRIMARY_A"
    | "PRIMARY_B";
  createdAt: string;
  updatedAt: string;
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
};
export type VerifyUserResponse = MessageResponse;

// Student API Types
export type CreateStudentRequest = CreateRequest<
  Student,
  | "name"
  | "profileImageUrl"
  | "dob"
  | "phoneNumber"
  | "whatsappNumber"
  | "alternateNumber"
  | "level"
>;
export type UpdateStudentRequest = UpdateRequest<
  Student,
  | "name"
  | "profileImageUrl"
  | "dob"
  | "phoneNumber"
  | "whatsappNumber"
  | "alternateNumber"
  | "level"
>;
export type CreateStudentResponse = EntityResponse<Student, "student">;
export type StudentsResponse = EntityListResponse<Student, "students">;
export type StudentResponse = EntityResponse<Student, "student">;
export type UpdateStudentResponse = EntityResponse<Student, "student">;

// Generic Response Types
export interface MessageResponse extends ApiResponse<null> {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}
