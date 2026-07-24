import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { can, hasPermission, type Permission, type WorkspaceContext } from '@/lib/permissions';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingScreen from '@/components/LoadingScreen';
import type { User } from '@/types/api';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('USER' | 'ADMIN')[];
    allowedSubRoles?: NonNullable<User['roleAssignments']>[number]['subRole'][];
    requireAdmin?: boolean; // shorthand for admin-only access
    allowAll?: boolean; // shorthand for allowing all authenticated users
    permission?: Permission;
    context?: WorkspaceContext;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles = [],
    allowedSubRoles = [],
    requireAdmin = false,
    allowAll = false,
    permission,
    context,
}) => {
    const { isAuthenticated, user, isLoading } = useAuth({ probeSession: true });
    const location = useLocation();
    const params = useParams();
    const workspaceContext: WorkspaceContext = context ?? {
        projectId: params.projectId,
        centerId: params.centerId,
        semesterId: params.semesterId,
    };

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <LoadingScreen message="Checking authentication..." />
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user has required permissions
    // Note: ADMIN users have access to all routes by default
    const isAllowed = permission
        ? can(user, permission, workspaceContext)
        : hasPermission(user, allowedRoles, allowedSubRoles, requireAdmin, allowAll);

    if (!isAllowed) {
        return (
            <div className="min-h-[100dvh] w-full bg-background overflow-hidden relative flex items-center justify-center">
                <DoodleBackground numElements={10} />
                <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600 mb-6">
                        You don't have permission to access this page.
                    </p>
                    <button
                        onClick={() => window.location.assign('/projects')}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                        Go to projects
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
