import type { User } from "@/types/api";

/**
 * Permission System Overview:
 *
 * 1. ADMIN users have universal access to all routes and components by default
 * 2. For non-admin users, the existing role-based logic applies:
 *    - allowAll: grants access to all authenticated users
 *    - requireAdmin: restricts access to admin users only
 *    - allowedRoles: checks user's main role (USER/ADMIN)
 *    - allowedSubRoles: checks user's sub-role assignments (CENTER_MANAGER, EDUCATOR, etc.)
 *
 * This ensures admins can access everything while maintaining granular control
 * for other user types based on their specific role assignments.
 */

// Helper function to check if user has required permissions
export const hasPermission = (
  user: User | null,
  allowedRoles: ("USER" | "ADMIN")[] = [],
  allowedSubRoles: string[] = [],
  requireAdmin: boolean = false,
  allowAll: boolean = false
): boolean => {
  if (!user) return false;

  // ADMIN users have access to everything by default
  if (user.role === "ADMIN") {
    return true;
  }

  // If allowAll is true, grant access to all authenticated users
  if (allowAll) {
    return true;
  }

  // If admin is required and user is not admin, deny access
  if (requireAdmin) {
    return false;
  }

  // If no specific restrictions, allow authenticated users
  if (allowedRoles.length === 0 && allowedSubRoles.length === 0) {
    return true;
  }

  // Check if user's role is in allowed roles
  if (allowedRoles.length > 0 && allowedRoles.includes(user.role)) {
    return true;
  }

  // Check if user has any of the allowed sub-roles
  if (allowedSubRoles.length > 0) {
    return (
      user.roleAssignments?.some(
        (assignment) =>
          assignment.isActive && allowedSubRoles.includes(assignment.subRole)
      ) || false
    );
  }

  return false;
};
