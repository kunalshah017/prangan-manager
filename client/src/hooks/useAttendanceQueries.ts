import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  ActiveUsersResponse,
  AttendanceRecordsResponse,
  MarkAttendanceRequest,
  MarkAttendanceResponse,
  BulkMarkAttendanceRequest,
  BulkMarkAttendanceResponse,
  AttendanceUser,
  AttendanceRecord,
} from "@/types/api";

// Attendance Queries
export const useActiveUsers = (
  date: string,
  projectId: string,
  centerId: string,
  semesterId: string
) => {
  return useQuery({
    queryKey: [
      "attendance",
      "active-users",
      date,
      projectId,
      centerId,
      semesterId,
    ],
    queryFn: async (): Promise<AttendanceUser[]> => {
      const params = new URLSearchParams({
        date,
        projectId,
        centerId,
        semesterId,
      });
      const response = await api.get<ActiveUsersResponse>(
        `/attendance/active-users?${params.toString()}`
      );
      return response.data.users;
    },
    enabled: !!date && !!projectId && !!centerId && !!semesterId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAttendanceRecords = (params: {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  userId?: string;
  status?: "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["attendance", "records", params],
    queryFn: async (): Promise<{
      attendances: AttendanceRecord[];
      totalCount: number;
      page: number;
      totalPages: number;
    }> => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      const response = await api.get<AttendanceRecordsResponse>(
        `/attendance/records?${searchParams.toString()}`
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Attendance Mutations
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      attendanceData: MarkAttendanceRequest
    ): Promise<MarkAttendanceResponse> => {
      return api.post<MarkAttendanceResponse>(
        "/attendance/mark",
        attendanceData
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch attendance records
      queryClient.invalidateQueries({
        queryKey: ["attendance", "records"],
      });
      // Also invalidate active users for the specific date
      queryClient.invalidateQueries({
        queryKey: ["attendance", "active-users", variables.date],
      });
    },
  });
};

export const useBulkMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      bulkAttendanceData: BulkMarkAttendanceRequest
    ): Promise<BulkMarkAttendanceResponse> => {
      return api.post<BulkMarkAttendanceResponse>(
        "/attendance/bulk-mark",
        bulkAttendanceData
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch attendance records
      queryClient.invalidateQueries({
        queryKey: ["attendance", "records"],
      });
      // Also invalidate active users for the specific date
      queryClient.invalidateQueries({
        queryKey: ["attendance", "active-users", variables.date],
      });
    },
  });
};
