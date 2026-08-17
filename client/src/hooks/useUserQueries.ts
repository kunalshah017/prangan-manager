import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  ContextStaffResponse,
  ContextStaffUser,
  RemunerationUser,
  RemunerationUsersResponse,
  SemesterUser,
  SemesterUsersResponse,
  User,
  UsersResponse,
  MessageResponse,
  RegistrationRequestsResponse,
  VerifyUserRequest,
  VerifyUserResponse,
} from "@/types/api";

// User Queries
// Note: These endpoints are not documented in the API but may be needed for admin functionality
export const useUsers = () => {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<User[]> => {
      const response = await api.get<UsersResponse>("/users");
      return response.users;
    },
    staleTime: 1 * 60 * 1000, // User data stays fresh for 1 minute
  });
};

export const useContextStaff = ({
  projectId,
  centerId,
  semesterId,
  enabled = true,
}: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ["users", "context-staff", projectId, centerId, semesterId],
    queryFn: async (): Promise<ContextStaffUser[]> => {
      const params = new URLSearchParams({
        projectId: projectId ?? "",
        centerId: centerId ?? "",
        semesterId: semesterId ?? "",
      });
      const response = await api.get<ContextStaffResponse>(
        `/users/context-staff?${params}`,
      );
      return response.users;
    },
    staleTime: 1 * 60 * 1000,
    enabled: Boolean(projectId && centerId && semesterId && enabled),
  });
};

export const useRemunerationUsers = ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
}) => {
  return useQuery({
    queryKey: ["users", "remuneration", projectId, centerId, semesterId],
    queryFn: async (): Promise<RemunerationUser[]> => {
      const params = new URLSearchParams({
        projectId: projectId ?? "",
        centerId: centerId ?? "",
        semesterId: semesterId ?? "",
      });
      const response = await api.get<RemunerationUsersResponse>(
        `/users/remuneration?${params}`,
      );
      return response.users;
    },
    staleTime: 1 * 60 * 1000,
    enabled: Boolean(projectId && centerId && semesterId),
  });
};

export const useUpdateRemunerationRates = ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rates: Array<{ userId: string; dailyRate: number }>) =>
      api.put("/users/remuneration/rates", {
        projectId,
        centerId,
        semesterId,
        rates,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [
          "users",
          "remuneration",
          projectId,
          centerId,
          semesterId,
        ],
      }),
  });
};

export const useSetRemunerationPeriod = ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period: {
      userId: string;
      amountPerDay: number;
      effectiveFrom: string;
    }) =>
      api.put("/users/remuneration/periods", {
        projectId,
        centerId,
        semesterId,
        ...period,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["users", "remuneration", projectId, centerId, semesterId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["users", "semester-users", projectId, centerId, semesterId],
        }),
      ]);
    },
  });
};

export const useSemesterUsers = ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
}) =>
  useQuery({
    queryKey: ["users", "semester-users", projectId, centerId, semesterId],
    queryFn: async (): Promise<SemesterUser[]> => {
      const params = new URLSearchParams({
        projectId: projectId ?? "",
        centerId: centerId ?? "",
        semesterId: semesterId ?? "",
      });
      const response = await api.get<SemesterUsersResponse>(
        `/users/semester-users?${params}`,
      );
      return response.users;
    },
    enabled: Boolean(projectId && centerId && semesterId),
  });

export const useUpdateSemesterUserAssignments = ({
  projectId,
  centerId,
  semesterId,
}: {
  projectId: string;
  centerId: string;
  semesterId: string;
}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      assignments,
    }: {
      userId: string;
      assignments: Array<{
        subRole: ContextStaffUser["roleAssignments"][number]["subRole"];
        semesterLevelId?: string;
        committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
      }>;
    }) =>
      api.put(`/users/semester-users/${userId}/assignments`, {
        projectId,
        centerId,
        semesterId,
        assignments,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["users", "semester-users", projectId, centerId, semesterId],
      }),
  });
};

export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async (): Promise<User> => {
      const response = await api.get<{ user: User }>(`/users/${userId}`);
      return response.user;
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!userId,
  });
};

export const usePendingUsers = () => {
  return useQuery({
    queryKey: queryKeys.pendingUsers,
    queryFn: async (): Promise<User[]> => {
      const response = await api.get<UsersResponse>("/users?status=PENDING");
      return response.users;
    },
    staleTime: 30 * 1000, // Pending users refresh every 30 seconds
  });
};

export const useRegistrationRequests = () => {
  return useQuery({
    queryKey: queryKeys.registrationRequests,
    queryFn: async (): Promise<User[]> => {
      const response = await api.get<RegistrationRequestsResponse>(
        "/users/registration-requests",
      );
      return response.users;
    },
    staleTime: 30 * 1000,
  });
};

// User Mutations - Using new verify endpoint
export const useVerifyUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      status,
      role,
      roleAssignments,
      rejectionReason,
    }: VerifyUserRequest): Promise<VerifyUserResponse> => {
      return api.post<VerifyUserResponse>("/users/verify", {
        userId,
        status,
        role,
        roleAssignments,
        rejectionReason,
      });
    },
    onSuccess: () => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingUsers });
      queryClient.invalidateQueries({
        queryKey: queryKeys.registrationRequests,
      });
    },
  });
};

export const useRevokeUserAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string): Promise<MessageResponse> =>
      api.delete(`/users/${userId}/access`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
};

// Convenience hooks for approve/reject with user object
export const useApproveUserById = () => {
  const verifyMutation = useVerifyUser();

  return useMutation({
    mutationFn: async ({
      user,
      roleAssignments,
    }: {
      user: User;
      roleAssignments?: VerifyUserRequest["roleAssignments"];
    }): Promise<VerifyUserResponse> => {
      return verifyMutation.mutateAsync({
        userId: user.id,
        status: "APPROVED",
        role: user.role || "USER",
        roleAssignments,
      });
    },
  });
};

export const useRejectUserById = () => {
  const verifyMutation = useVerifyUser();

  return useMutation({
    mutationFn: async ({
      user,
      rejectionReason,
    }: {
      user: User;
      rejectionReason: string;
    }): Promise<VerifyUserResponse> => {
      return verifyMutation.mutateAsync({
        userId: user.id,
        status: "REJECTED",
        role: user.role || "USER",
        rejectionReason,
      });
    },
  });
};

// Legacy mutations for backward compatibility (will use verify endpoint internally)
export const useApproveUser = () => {
  const verifyMutation = useVerifyUser();

  return useMutation({
    mutationFn: async (user: User): Promise<MessageResponse> => {
      const result = await verifyMutation.mutateAsync({
        userId: user.id,
        status: "APPROVED",
        role: user.role || "USER",
      });
      return result;
    },
  });
};

export const useRejectUser = () => {
  const verifyMutation = useVerifyUser();

  return useMutation({
    mutationFn: async ({
      user,
      rejectionReason,
    }: {
      user: User;
      rejectionReason: string;
    }): Promise<MessageResponse> => {
      const result = await verifyMutation.mutateAsync({
        userId: user.id,
        status: "REJECTED",
        role: user.role || "USER",
        rejectionReason,
      });
      return result;
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      userData,
      roleAssignments,
    }: {
      userId: string;
      userData: {
        firstName?: string;
        middleName?: string | null;
        lastName?: string | null;
        email?: string;
        phone?: string;
        qualification?: string;
        address?: string;
        dob?: string | null;
        role?: "USER" | "ADMIN";
      };
      roleAssignments?: Array<{
        subRole: string;
        projectId?: string;
        centerId?: string;
        semesterId?: string;
        semesterLevelId?: string;
        committedDays?: string;
      }>;
    }): Promise<{ message: string; user: User }> => {
      const { role, ...profileData } = userData;
      const profileResult = await api.put<{ message: string; user: User }>(
        `/users/${userId}`,
        profileData,
      );

      if (role !== undefined || roleAssignments !== undefined) {
        await api.put(`/users/${userId}/management`, {
          role,
          roleAssignments,
        });
      }

      return profileResult;
    },
    onSuccess: (_, variables) => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
};
