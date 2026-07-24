import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  useCurrentUser,
  useLogin,
  useRegister,
  useLogout,
} from "@/hooks/useAuthQueries";
import { isCurrentUserAuthenticated } from "@/lib/session";
import type { LoginRequest, RegisterRequest } from "@/types/api";

export const useAuth = ({
  probeSession = false,
}: { probeSession?: boolean } = {}) => {
  const authStore = useAuthStore();

  // Get current user query
  const {
    data: currentUser,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useCurrentUser(probeSession);

  // Mutations
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  // Sync query data with auth store
  useEffect(() => {
    if (currentUser) {
      // If we have user data and store doesn't have it, or data is different, update store
      if (!authStore.user || authStore.user.id !== currentUser.id) {
        authStore.setAuth(currentUser);
      }
    }
  }, [currentUser, authStore]);

  // Handle user query errors (e.g., token expired)
  useEffect(() => {
    if (isUserError && authStore.isAuthenticated) {
      // If we get an error fetching user but we think we're authenticated,
      // it likely means the token is invalid, so logout
      authStore.clearAuth();
    }
    if (isUserError && !authStore.hasProbedSession) {
      authStore.markSessionProbeComplete();
    }
  }, [isUserError, authStore]);

  const login = async (credentials: LoginRequest) => {
    return loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: RegisterRequest) => {
    return registerMutation.mutateAsync(userData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Determine auth state based on both store and current query
  const isAuthenticated = isCurrentUserAuthenticated(
    !!currentUser,
    authStore.isAuthenticated,
    isUserLoading,
  );

  return {
    // State
    user: currentUser || authStore.user,
    isAuthenticated,
    isLoading:
      isUserLoading || loginMutation.isPending || registerMutation.isPending,

    // Actions
    login,
    register,
    logout,

    // Helper
    isAdmin: () => {
      const user = currentUser || authStore.user;
      return user?.role === "ADMIN";
    },

    // Check if user has any of the specified sub-roles
    hasSubRole: (subRoles: string[]) => {
      const user = currentUser || authStore.user;
      if (user?.role === "ADMIN") return true; // Admins have access to everything

      return (
        user?.roleAssignments?.some(
          (assignment) =>
            assignment.isActive && subRoles.includes(assignment.subRole),
        ) || false
      );
    },

    // Check if user is an educator
    isEducator: () => {
      const user = currentUser || authStore.user;
      if (user?.role === "ADMIN") return true; // Admins have access to everything

      return (
        user?.roleAssignments?.some(
          (assignment) =>
            assignment.isActive && assignment.subRole === "EDUCATOR",
        ) || false
      );
    },

    // Check if user is a center manager
    isCenterManager: () => {
      const user = currentUser || authStore.user;
      if (user?.role === "ADMIN") return true; // Admins have access to everything

      return (
        user?.roleAssignments?.some(
          (assignment) =>
            assignment.isActive && assignment.subRole === "CENTER_MANAGER",
        ) || false
      );
    },

    // Mutation states
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  };
};
