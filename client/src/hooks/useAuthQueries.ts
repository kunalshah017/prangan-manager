import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UserDetailsResponse,
  User,
} from "@/types/api";

// Auth Hooks
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<LoginResponse> => {
      return api.post<LoginResponse>("/users/login", credentials);
    },
    onSuccess: (data) => {
      // Store the token
      localStorage.setItem("prangan_auth_token", data.token);

      // Invalidate and refetch current user - this will trigger auth store sync
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
    onError: () => {
      // Clear any existing auth data on error
      localStorage.removeItem("prangan_auth_token");
      localStorage.removeItem("prangan_user");
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (
      userData: RegisterRequest
    ): Promise<RegisterResponse> => {
      return api.post<RegisterResponse>("/users/register", userData);
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async (): Promise<User> => {
      const response = await api.get<UserDetailsResponse>("/users/me");
      return response.user;
    },
    enabled: !!localStorage.getItem("prangan_auth_token"), // Only fetch if token exists
    retry: false, // Don't retry auth requests
    staleTime: 5 * 60 * 1000, // User data stays fresh for 5 minutes
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear local storage
      localStorage.removeItem("prangan_auth_token");
      localStorage.removeItem("prangan_user");

      // Clear all queries from cache
      queryClient.clear();
    },
  });
};
