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
  semesterId: string,
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
        `/attendance/active-users?${params.toString()}`,
      );
      return response.data.users;
    },
    enabled: !!date && !!projectId && !!centerId && !!semesterId,
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
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["attendance", "records", params],
    queryFn: async (): Promise<{
      attendances: AttendanceRecord[];
      totalCount: number;
      page: number;
      totalPages: number;
    }> => {
      // Fetch first page to get total pages
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (key !== "enabled" && value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });

      const firstResponse = await api.get<AttendanceRecordsResponse>(
        `/attendance/records?${searchParams.toString()}`,
      );

      const { totalPages, totalCount } = firstResponse.data;

      // If there's only one page, return immediately
      if (totalPages <= 1) {
        return firstResponse.data;
      }

      // Fetch remaining pages in parallel
      const pagePromises: Promise<AttendanceRecordsResponse>[] = [];
      for (let page = 2; page <= totalPages; page++) {
        const pageParams = new URLSearchParams(searchParams);
        pageParams.set("page", page.toString());
        pagePromises.push(
          api.get<AttendanceRecordsResponse>(
            `/attendance/records?${pageParams.toString()}`,
          ),
        );
      }

      // Wait for all pages to complete
      const additionalResponses = await Promise.all(pagePromises);

      // Combine all attendances
      const allAttendances = [
        ...firstResponse.data.attendances,
        ...additionalResponses.flatMap((res) => res.data.attendances),
      ];

      return {
        attendances: allAttendances,
        totalCount,
        page: 1,
        totalPages: 1, // Return 1 since we've fetched everything
      };
    },
    enabled: params.enabled ?? true,
  });
};

// Attendance Mutations
export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      attendanceData: MarkAttendanceRequest,
    ): Promise<MarkAttendanceResponse> => {
      return api.post<MarkAttendanceResponse>(
        "/attendance/mark",
        attendanceData,
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
      bulkAttendanceData: BulkMarkAttendanceRequest,
    ): Promise<BulkMarkAttendanceResponse> => {
      return api.post<BulkMarkAttendanceResponse>(
        "/attendance/bulk-mark",
        bulkAttendanceData,
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
