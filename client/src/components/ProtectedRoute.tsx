import { ShieldAlert } from 'lucide-react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { StandalonePageNavigation } from '@/components/StandalonePageNavigation';
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
    standaloneDenied?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles = [],
    allowedSubRoles = [],
    requireAdmin = false,
    allowAll = false,
    permission,
    context,
    standaloneDenied = false,
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
        const denialContent = (
            <>
                <DoodleBackground numElements={10} />
                <div className="relative z-10 mx-auto w-full max-w-md">
                    {standaloneDenied && (
                        <StandalonePageNavigation
                            parentHref="/projects"
                            parentLabel="Projects"
                            currentLabel="Access denied"
                            backLabel="Back to projects"
                            className="mb-8"
                        />
                    )}
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
                        </div>
                        <h1 id="access-denied-title" className="mb-2 text-2xl font-semibold text-foreground">
                            Access denied
                        </h1>
                        <p className="mb-6 text-muted-foreground">
                            You don't have permission to access this page.
                        </p>
                        {standaloneDenied && (
                            <Link
                                to="/projects"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                Go to projects
                            </Link>
                        )}
                    </div>
                </div>
            </>
        );

        return standaloneDenied ? (
            <main
                aria-labelledby="access-denied-title"
                className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-background px-4"
            >
                {denialContent}
            </main>
        ) : (
            <section aria-labelledby="access-denied-title" className="relative flex w-full items-center justify-center overflow-hidden px-4 py-16">
                {denialContent}
            </section>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
