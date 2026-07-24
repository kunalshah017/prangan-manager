import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";
import { AUTH_STORE_STORAGE_KEY } from "@/lib/session";
import { clearBrowserSession } from "@/lib/session-runtime";

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  hasSessionHint: boolean;
  hasProbedSession: boolean;

  // Actions
  setAuth: (user: User) => void;
  setUser: (user: User) => void;
  markSessionProbeComplete: () => void;
  clearAuth: () => void;
  logout: () => void;

  // Helper to check if user is admin
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const resetSession = () => {
        set({
          user: null,
          isAuthenticated: false,
          hasSessionHint: false,
          hasProbedSession: true,
        });
        clearBrowserSession();
      };

      return {
        // Initial state
        user: null,
        isAuthenticated: false,
        hasSessionHint: false,
        hasProbedSession: false,

        // Set authentication data (login success)
        setAuth: (user: User) => {
          set({
            user,
            isAuthenticated: true,
            hasSessionHint: true,
            hasProbedSession: true,
          });
        },

        // Update user data (for refreshing user info)
        setUser: (user: User) => {
          set({
            user,
            isAuthenticated: true,
            hasSessionHint: true,
            hasProbedSession: true,
          });
        },

        markSessionProbeComplete: () => {
          set({ hasSessionHint: false, hasProbedSession: true });
        },

        clearAuth: resetSession,
        logout: resetSession,

        // Check if user is admin
        isAdmin: () => {
          const { user } = get();
          return user?.role === "ADMIN";
        },
      };
    },
    {
      name: AUTH_STORE_STORAGE_KEY,
      partialize: (state) => ({
        hasSessionHint: state.hasSessionHint,
      }),
    },
  ),
);

// Utility function to initialize auth state from localStorage on app start
export const initializeAuth = () => {
  const { hasSessionHint } = useAuthStore.getState();
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    hasSessionHint,
    hasProbedSession: !hasSessionHint,
  });
};
