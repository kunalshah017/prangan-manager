import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';

interface PublicRouteProps {
    children: React.ReactNode;
}

/**
 * PublicRoute component that redirects authenticated users to /projects
 * and shows a loading state while checking authentication
 */
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <LoadingScreen message="Checking authentication..." />
        );
    }

    // Redirect to projects if authenticated
    if (isAuthenticated) {
        return <Navigate to="/projects" state={{ from: location }} replace />;
    }

    // Render children for non-authenticated users
    return <>{children}</>;
};

export default PublicRoute;
