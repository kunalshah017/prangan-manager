import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import DoodleBackground from '@/components/DoodleBackground';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
    const { isAuthenticated, user, isLoading } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        // Check authentication status on mount
        // The auth store should already be initialized from localStorage
    }, []);

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen w-full bg-background overflow-hidden relative flex items-center justify-center">
                <DoodleBackground numElements={10} />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="animate-pulse h-10 w-10 rounded-full bg-orange-500 mb-4" />
                    <p className="text-orange-700 font-medium">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check admin permission if required
    if (adminOnly && user.role !== 'ADMIN') {
        return (
            <div className="min-h-screen w-full bg-background overflow-hidden relative flex items-center justify-center">
                <DoodleBackground numElements={10} />
                <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600 mb-6">
                        You don't have permission to access this page. Admin privileges are required.
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
