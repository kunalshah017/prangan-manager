import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  ContextStaffResponse,
  ContextStaffUser,
  RemunerationUser,
  RemunerationUsersResponse,
  User,
  UsersResponse,
  MessageResponse,
  RegistrationRequestsResponse,
  RestoreUserAccessRequest,
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

// Saves a person's daily rate in one semester from a date: days before it keep
// their earlier rate. The person needs an educator or centre manager role there.
export const useSaveRemunerationPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (period: {
      projectId: string;
      centerId: string;
      semesterId: string;
      userId: string;
      amountPerDay: number;
      effectiveFrom: string;
    }) => api.put("/users/remuneration/periods", period),
    onSuccess: (_result, period) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user", period.userId] }),
        queryClient.invalidateQueries({ queryKey: ["users", "remuneration"] }),
      ]),
  });
};

export const useUser = (userId: string, options: { enabled?: boolean } = {}) => {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: async (): Promise<User> => {
      const response = await api.get<{ user: User }>(`/users/${userId}`);
      return response.user;
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!userId && (options.enabled ?? true),
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
      sendEmail,
      remunerationPeriods,
    }: VerifyUserRequest): Promise<VerifyUserResponse> => {
      return api.post<VerifyUserResponse>("/users/verify", {
        userId,
        status,
        role,
        roleAssignments,
        rejectionReason,
        sendEmail,
        remunerationPeriods,
      });
    },
    onSuccess: (_, { userId }) => {
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingUsers });
      queryClient.invalidateQueries({
        queryKey: queryKeys.registrationRequests,
      });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
  });
};

export const useRestoreUserAccess = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, ...grant }: RestoreUserAccessRequest): Promise<MessageResponse> =>
      api.post(`/users/${userId}/access`, grant),
    onSuccess: (_result, { userId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users }),
        queryClient.invalidateQueries({ queryKey: ["user", userId] }),
      ]),
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

export type BankDetailsPatch = Partial<{
  bankAccountNumber: string;
  bankAccountName: string;
  bankIfsc: string;
  bankName: string;
  bankBranch: string;
  upiId: string;
}>;

// Admin-only. Sends just the fields that were filled in; the server keeps the
// rest and answers with a masked summary, never the full account number.
export const useUpdateUserBankDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, bank }: { userId: string; bank: BankDetailsPatch }) =>
      api.put<{ bankSummary: User["bankSummary"] }>(`/users/${userId}/bank`, bank),
    onSuccess: (_, { userId }) => queryClient.invalidateQueries({ queryKey: ["user", userId] }),
  });
};
