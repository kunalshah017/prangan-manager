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
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface Center {
  id: string;
  name: string;
  description: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  centerId: string;
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

export interface CreateProjectResponse {
  message: string;
  project: Project;
}

export interface ProjectsResponse {
  projects: Project[];
}

// Center API
export interface CreateCenterRequest {
  name: string;
  description: string;
  location: string;
}

export interface CreateCenterResponse {
  message: string;
  center: Center;
}

export interface CentersResponse {
  centers: Center[];
}

// Semester API
export interface CreateSemesterRequest {
  name: string;
  startDate: string;
  endDate: string;
  centerId: string;
}

export interface CreateSemesterResponse {
  message: string;
  semester: Semester;
}

// API Error Response
export interface ApiError {
  message: string;
}
