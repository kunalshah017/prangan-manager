import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type { User } from "@/types/api";

// User Queries
export const useUsers = () => {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async (): Promise<User[]> => {
      const response = await api.get<{ users: User[] }>("/users");
      return response.users;
    },
    staleTime: 1 * 60 * 1000, // User data stays fresh for 1 minute
  });
};

export const usePendingUsers = () => {
  return useQuery({
    queryKey: queryKeys.pendingUsers,
    queryFn: async (): Promise<User[]> => {
      const response = await api.get<{ users: User[] }>(
        "/users?status=PENDING"
      );
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
      const response = await api.get<{ users: User[] }>(
        "/users?status=PENDING"
      );
      return response.users;
    },
    staleTime: 30 * 1000,
  });
};

// User Mutations
export const useApproveUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<{ message: string }> => {
      return api.put<{ message: string }>(`/users/${userId}/approve`);
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
    mutationFn: async (userId: string): Promise<{ message: string }> => {
      return api.put<{ message: string }>(`/users/${userId}/reject`);
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
    }): Promise<{ message: string }> => {
      return api.put<{ message: string }>(`/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
};
