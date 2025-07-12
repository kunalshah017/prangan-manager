// API Types
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

// Auth API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  phone?: string;
  qualification?: string;
  address?: string;
  dob?: string;
}

export interface RegisterResponse {
  message: string;
}

// User Details API
export interface UserDetailsResponse {
  message: string;
  user: User;
}

// Project API
export interface CreateProjectRequest {
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
  projectType?: string;
  imageUrl?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: "ACTIVE" | "INACTIVE";
  metadata?: Record<string, unknown>;
  projectType?: string;
  imageUrl?: string;
}

export interface CreateProjectResponse {
  message: string;
  project: Project;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface ProjectResponse {
  project: Project;
}

export interface UpdateProjectResponse {
  message: string;
  project: Project;
}

// Center API
export interface CreateCenterRequest {
  name: string;
  address: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCenterRequest {
  name?: string;
  address?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCenterResponse {
  message: string;
  center: Center;
}

export interface CentersResponse {
  centers: Center[];
}

export interface CenterResponse {
  center: Center;
}

export interface UpdateCenterResponse {
  message: string;
  center: Center;
}

// Semester API
export interface CreateSemesterRequest {
  name: string;
  startDate: string;
  endDate: string;
  centerId?: string; // Made optional since README doesn't show it in request
}

export interface UpdateSemesterRequest {
  name?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateSemesterResponse {
  message: string;
  semester: Semester;
}

export interface SemestersResponse {
  semesters: Semester[];
}

export interface SemesterResponse {
  semester: Semester;
}

export interface UpdateSemesterResponse {
  message: string;
  semester: Semester;
}

// User Management API
export interface UsersResponse {
  users: User[];
}

// API Error Response
export interface ApiError {
  message: string;
}

// Generic message response
export interface MessageResponse {
  message: string;
}
