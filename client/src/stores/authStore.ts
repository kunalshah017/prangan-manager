import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  UserDetailsResponse,
} from "@/types/api";
import { isTokenExpired } from "@/lib/auth";

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  refreshUser: () => Promise<void>;

  // Helper to check if user is admin
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post<LoginResponse>(
            "/users/login",
            credentials
          );
          const { token } = response.data;

          // Check if token is valid
          if (isTokenExpired(token)) {
            throw new Error("Received expired token");
          }

          // Store token
          localStorage.setItem("prangan_auth_token", token);

          // Fetch user details from the server
          const userResponse = await api.get<UserDetailsResponse>("/users/me");
          const { user } = userResponse.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          let errorMessage = "Login failed. Please check your credentials.";

          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (
            error &&
            typeof error === "object" &&
            "response" in error
          ) {
            const apiError = error as {
              response: { data?: { message?: string } };
            };
            errorMessage = apiError.response?.data?.message || errorMessage;
          }

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });

          // Remove any stored token
          localStorage.removeItem("prangan_auth_token");
          throw error;
        }
      },

      // Register action
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          await api.post<RegisterResponse>("/users/register", userData);

          set({
            isLoading: false,
            error: null,
          });
        } catch (error) {
          let errorMessage = "Registration failed. Please try again.";

          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (
            error &&
            typeof error === "object" &&
            "response" in error
          ) {
            const apiError = error as {
              response: { data?: { message?: string } };
            };
            errorMessage = apiError.response?.data?.message || errorMessage;
          }

          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Logout action
      logout: () => {
        localStorage.removeItem("prangan_auth_token");
        localStorage.removeItem("prangan_user");

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Refresh user data from server
      refreshUser: async () => {
        const { token, isAuthenticated } = get();

        if (!token || !isAuthenticated) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const userResponse = await api.get<UserDetailsResponse>("/users/me");
          const { user } = userResponse.data;

          set({
            user,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          let errorMessage = "Failed to refresh user data.";

          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (
            error &&
            typeof error === "object" &&
            "response" in error
          ) {
            const apiError = error as {
              response: { status?: number; data?: { message?: string } };
            };

            // If 401, token is invalid - logout
            if (apiError.response?.status === 401) {
              get().logout();
              return;
            }

            errorMessage = apiError.response?.data?.message || errorMessage;
          }

          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Check if user is admin
      isAdmin: () => {
        const { user } = get();
        return user?.role === "ADMIN";
      },
    }),
    {
      name: "prangan-auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Utility function to initialize auth state from localStorage on app start
export const initializeAuth = async () => {
  const token = localStorage.getItem("prangan_auth_token");

  if (token) {
    // Validate token
    try {
      if (isTokenExpired(token)) {
        useAuthStore.getState().logout();
        return;
      }

      // Token is valid, try to fetch current user details
      const { isAuthenticated, user } = useAuthStore.getState();

      if (!isAuthenticated || !user) {
        // State is inconsistent or missing, fetch user details from server
        try {
          const userResponse = await api.get<UserDetailsResponse>("/users/me");
          const { user: serverUser } = userResponse.data;

          useAuthStore.setState({
            user: serverUser,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch {
          // Failed to fetch user details, token might be invalid
          useAuthStore.getState().logout();
        }
      }
    } catch {
      // Invalid token, clear it
      useAuthStore.getState().logout();
    }
  }
};
