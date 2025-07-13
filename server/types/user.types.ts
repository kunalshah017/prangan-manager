// Remove custom User interface and export Prisma types
export type {
  User,
  Role,
  UserStatus,
  Level,
} from "../generated/prisma/index.js";

// Optional: Create custom types for API requests if needed
export interface UserRegistrationRequest {
  name: string;
  email: string;
  phone?: string;
  qualification?: string;
  address?: string;
  profileImageUrl?: string;
  dob?: string; // Accept as string in API, convert to Date in controller
}

export interface UserUpdateRequest {
  name?: string;
  phone?: string;
  qualification?: string;
  address?: string;
  profileImageUrl?: string;
  dob?: string; // Accept as string in API, convert to Date in controller
}
