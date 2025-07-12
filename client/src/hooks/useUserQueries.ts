import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type { User, UsersResponse, MessageResponse } from "@/types/api";

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
      // For now, this returns pending users - can be updated when actual endpoint is available
      const response = await api.get<UsersResponse>("/users?status=PENDING");
      return response.users;
    },
    staleTime: 30 * 1000,
  });
};

// User Mutations
// Note: These endpoints are not documented in the API but may be needed for admin functionality
export const useApproveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<MessageResponse> => {
      return api.put<MessageResponse>(`/users/${userId}/approve`);
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

export const useRejectUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<MessageResponse> => {
      return api.put<MessageResponse>(`/users/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingUsers });
      queryClient.invalidateQueries({
        queryKey: queryKeys.registrationRequests,
      });
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
