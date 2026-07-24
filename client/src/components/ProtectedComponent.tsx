import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { can, hasPermission, type Permission, type WorkspaceContext } from '@/lib/permissions';

interface ProtectedComponentProps {
    children: React.ReactNode;
    allowedRoles?: ('USER' | 'ADMIN')[];
    allowedSubRoles?: string[];
    requireAdmin?: boolean;
    allowAll?: boolean; // shorthand for allowing all authenticated users
    fallback?: React.ReactNode; // Optional fallback content when access is denied
    permission?: Permission;
    context?: WorkspaceContext;
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
    children,
    allowedRoles = [],
    allowedSubRoles = [],
    requireAdmin = false,
    allowAll = false,
    fallback = null,
    permission,
    context,
}) => {
    const { user, isAuthenticated } = useAuth();

    // If not authenticated, don't show anything
    if (!isAuthenticated || !user) {
        return <>{fallback}</>;
    }

    // Check if user has required permissions
    // Note: ADMIN users have access to all components by default
    const isAllowed = permission
        ? can(user, permission, context)
        : hasPermission(user, allowedRoles, allowedSubRoles, requireAdmin, allowAll);

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default ProtectedComponent;
