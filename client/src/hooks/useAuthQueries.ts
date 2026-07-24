import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import {
  establishAuthenticatedSession,
  shouldFetchCurrentUser,
} from "@/lib/session";
import { useAuthStore } from "@/stores/authStore";
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
      establishAuthenticatedSession({
        user: data.user,
        storage: localStorage,
        queryClient,
        setAuth: useAuthStore.getState().setAuth,
      });
    },
    onError: () => {
      useAuthStore.getState().clearAuth();
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (
      userData: RegisterRequest,
    ): Promise<RegisterResponse> => {
      return api.post<RegisterResponse>("/users/register", userData);
    },
  });
};

export const useCurrentUser = (probeSession: boolean) => {
  const { hasProbedSession, hasSessionHint } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: async (): Promise<User> => {
      const response = await api.get<UserDetailsResponse>("/users/me");
      return response.user;
    },
    enabled: shouldFetchCurrentUser(
      probeSession,
      hasSessionHint,
      hasProbedSession,
    ),
    retry: false, // Don't retry auth requests
    staleTime: 5 * 60 * 1000, // User data stays fresh for 5 minutes
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      await api.post("/users/logout");
      useAuthStore.getState().clearAuth();
    },
  });
};

// Update current user's bank details
export const useUpdateBankDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      bankAccountNumber?: string;
      bankAccountName?: string;
      bankIfsc?: string;
      bankName?: string;
      bankBranch?: string;
      upiId?: string;
    }): Promise<{ message: string; user: User }> => {
      return api.put<{ message: string; user: User }>("/users/me/bank", data);
    },
    onSuccess: () => {
      // Refresh current user so UI picks up new fields
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
};

export const useUpdateMyProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      firstName?: string;
      middleName?: string | null;
      lastName?: string | null;
      email?: string;
      phone?: string;
      qualification?: string;
      address?: string;
      dob?: string | null;
      profileImageUrl?: string | null;
    }): Promise<{ message: string; user: User }> => {
      const user = useAuthStore.getState().user;
      if (!user)
        throw new Error("You must be signed in to update your profile.");

      return api.put<{ message: string; user: User }>(
        `/users/${user.id}`,
        data,
      );
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.currentUser, response.user);
      useAuthStore.getState().setUser(response.user);
    },
  });
};
