import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-error";

// Configure the QueryClient with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data stays fresh before refetching
      staleTime: 5 * 60 * 1000, // 5 minutes
      // How long data stays in cache after component unmounts
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        ) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Refetch on window focus for important data
      refetchOnWindowFocus: false,
      // Network status refetching
      refetchOnReconnect: "always",
    },
    mutations: {
      // Mutations can create duplicate side effects, so never retry by default
      retry: false,
    },
  },
});

export const semesterSetupSummariesKey = (centerId: string) =>
  ["centers", centerId, "semester-setup-summaries"] as const;

// Query key factory for consistent query keys
export const queryKeys = {
  // Auth related
  currentUser: ["user", "me"] as const,

  // Projects
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,

  // Centers
  centers: ["centers"] as const,
  center: (id: string) => ["centers", id] as const,
  centersByProject: (projectId: string) =>
    ["centers", "project", projectId] as const,

  // Semesters
  semesters: ["semesters"] as const,
  semester: (id: string) => ["semesters", id] as const,
  semestersByCenter: (centerId: string) =>
    ["semesters", "center", centerId] as const,

  // Managed levels
  academicLevelsRoot: ["academic-levels"] as const,
  academicLevels: (includeArchived = false) =>
    ["academic-levels", { includeArchived }] as const,
  semesterLevelsRoot: (semesterId: string) =>
    ["semesters", semesterId, "levels"] as const,
  semesterLevels: (semesterId: string, includeInactive = false) =>
    ["semesters", semesterId, "levels", { includeInactive }] as const,

  // Users and admin
  users: ["users"] as const,
  user: (id: string) => ["users", id] as const,
  pendingUsers: ["users", "pending"] as const,
  registrationRequests: ["users", "registration-requests"] as const,

  // Students
  students: ["students"] as const,
  student: (id: string) => ["students", id] as const,
  studentsBySemesterLevel: (semesterLevelId: string) =>
    ["students", "semester-level", semesterLevelId] as const,
  /** @deprecated Use studentsBySemesterLevel. */
  studentsByLevel: (level: string) => ["students", "level", level] as const,

  // Syllabus
  syllabi: ["syllabi"] as const,
  syllabus: (id: string) => ["syllabi", id] as const,
  syllabusTopics: ["syllabus-topics"] as const,
  syllabusTopic: (id: string) => ["syllabus-topics", id] as const,
  syllabusStatistics: ["syllabus-statistics"] as const,
  progressLogs: ["progress-logs"] as const,
};

export default queryClient;
