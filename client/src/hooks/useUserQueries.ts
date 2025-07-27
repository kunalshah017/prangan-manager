import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
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
        "/users/registration-requests"
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
      email,
      name,
      roleAssignments,
      rejectionReason,
    }: VerifyUserRequest): Promise<VerifyUserResponse> => {
      return api.post<VerifyUserResponse>("/users/verify", {
        userId,
        status,
        role,
        email,
        name,
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
        email: user.email,
        name: user.name,
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
        email: user.email,
        name: user.name,
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
        email: user.email,
        name: user.name,
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
        email: user.email,
        name: user.name,
        rejectionReason,
      });
      return result;
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: "USER" | "ADMIN";
    }): Promise<MessageResponse> => {
      return api.put<MessageResponse>(`/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
};
