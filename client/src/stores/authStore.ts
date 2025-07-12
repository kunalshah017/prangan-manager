import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  logout: () => void;

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

      // Set authentication data (login success)
      setAuth: (user: User, token: string) => {
        localStorage.setItem("prangan_auth_token", token);
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      // Update user data (for refreshing user info)
      setUser: (user: User) => {
        set({ user });
      },

      // Clear authentication data
      clearAuth: () => {
        localStorage.removeItem("prangan_auth_token");
        localStorage.removeItem("prangan_user");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      // Logout action
      logout: () => {
        localStorage.removeItem("prangan_auth_token");
        localStorage.removeItem("prangan_user");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
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
export const initializeAuth = () => {
  const token = localStorage.getItem("prangan_auth_token");

  if (token) {
    const { user, isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated || !user) {
      // Set the token so the useCurrentUser query can run
      useAuthStore.setState({
        token,
        isAuthenticated: true,
      });
    }
  } else {
    // No token, ensure we're logged out
    useAuthStore.getState().clearAuth();
  }
};
