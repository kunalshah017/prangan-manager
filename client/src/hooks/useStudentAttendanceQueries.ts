import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  StudentAttendanceRecordsResponse,
  BulkMarkStudentAttendanceRequest,
  MarkStudentAttendanceRequest,
  StudentsBySemesterResponse,
} from "@/types/api";

// Get students by semester for attendance marking
export const useStudentsBySemester = (semesterId: string) => {
  return useQuery({
    queryKey: ["students", "semester", semesterId, "attendance"], // Added "attendance" to make it unique
    queryFn: () => api.students.getBySemester(semesterId),
    enabled: !!semesterId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: StudentsBySemesterResponse) => {
      // Transform the enrollment data to extract students with enrollment info
      return {
        students:
          data.enrollments?.map((enrollment) => ({
            ...enrollment.student,
            enrollments: [enrollment], // Include enrollment data
          })) || [],
      };
    },
  });
};

// Get student attendance records with filters
interface UseStudentAttendanceRecordsOptions {
  studentId?: string;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export const useStudentAttendanceRecords = (
  options: UseStudentAttendanceRecordsOptions
) => {
  const queryParams = new URLSearchParams();

  if (options.studentId) queryParams.append("studentId", options.studentId);
  if (options.projectId) queryParams.append("projectId", options.projectId);
  if (options.centerId) queryParams.append("centerId", options.centerId);
  if (options.semesterId) queryParams.append("semesterId", options.semesterId);
  if (options.date) queryParams.append("date", options.date);
  if (options.startDate) queryParams.append("dateFrom", options.startDate);
  if (options.endDate) queryParams.append("dateTo", options.endDate);
  if (options.status) queryParams.append("status", options.status);

  return useQuery({
    queryKey: ["student-attendance", options],
    queryFn: async (): Promise<StudentAttendanceRecordsResponse> => {
      const response = await fetch(
        `${api.baseURL}/student-attendance?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${api.getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch student attendance records");
      }

      return response.json();
    },
    enabled: !!(options.projectId && options.centerId && options.semesterId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Bulk mark student attendance
export const useBulkMarkStudentAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkMarkStudentAttendanceRequest) => {
      const response = await fetch(`${api.baseURL}/student-attendance/bulk`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to mark student attendance"
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
      queryClient.invalidateQueries({
        queryKey: [
          "student-attendance",
          {
            projectId: variables.projectId,
            centerId: variables.centerId,
            semesterId: variables.semesterId,
          },
        ],
      });
    },
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (
        error.message.includes("400") ||
        error.message.includes("401") ||
        error.message.includes("403")
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Mark single student attendance
export const useMarkStudentAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MarkStudentAttendanceRequest) => {
      const response = await fetch(`${api.baseURL}/student-attendance/mark`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api.getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to mark student attendance"
        );
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["student-attendance"] });
      queryClient.invalidateQueries({
        queryKey: [
          "student-attendance",
          {
            projectId: variables.projectId,
            centerId: variables.centerId,
            semesterId: variables.semesterId,
          },
        ],
      });
    },
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (
        error.message.includes("400") ||
        error.message.includes("401") ||
        error.message.includes("403")
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
};
