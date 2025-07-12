import { Plus, Clock, MapPin, Edit, School } from 'lucide-react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/lib/button-variants';
import { useEffect, useState } from 'react';
import DoodleBackground from '@/components/DoodleBackground';
import LoadingButterfly from '@/components/LoadingButterfly';
import { useCentersByProject } from '@/hooks/useCenterQueries';
import { useProject } from '@/hooks/useProjectQueries';
import { useAuth } from '@/hooks/useAuth';

const Centers = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { isAdmin } = useAuth();

    // Fetch centers for this specific project and project details
    const { data: centers, isLoading, error, refetch } = useCentersByProject(projectId!);
    const { data: project, isLoading: projectLoading } = useProject(projectId!);

    useEffect(() => {
        // Check if there's a success message from navigation state
        if (location.state?.message && location.state?.type === 'success') {
            setSuccessMessage(location.state.message);
            // Clear the message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
            // Clear the navigation state
            navigate(location.pathname, { replace: true });
            // Refetch centers after a successful operation
            refetch();
        }
    }, [location.state, navigate, location.pathname, refetch]);

    const handleCenterClick = (centerId: string) => {
        // Navigate to semesters for this center
        navigate(`/projects/${projectId}/centers/${centerId}/semesters`);
    };

    // Show loading state
    if (isLoading || projectLoading) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <LoadingButterfly size="md" />
                </div>
            </>
        );
    }

    // Show error state
    if (error) {
        return (
            <>
                <DoodleBackground numElements={12} />
                <div className="flex flex-col items-center justify-center min-h-[400px] relative z-1">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <span className="text-red-600 text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load centers</h2>
                    <p className="text-gray-600 mb-4">{error.message}</p>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </>
        );
    }

    // Sort centers by updatedAt in descending order (most recent first)
    const centerList = (centers || []).sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return (
        <>
            <DoodleBackground numElements={12} />
            <div className="flex flex-col space-y-4 w-full relative z-1">
                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md animate-fade-in">
                        {successMessage}
                    </div>
                )}
                {/* Search and filters bar */}
                <div className="flex gap-3 sm:flex-row sm:items-center sm:gap-4 pb-6 w-full justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">
                        Centers
                    </h1>
                    <div className="flex gap-2 sm:w-auto justify-end">
                        {isAdmin() && (
                            <Link
                                to={`/projects/${projectId}/centers/new`}
                                className={cn(
                                    buttonVariants({ size: "default" }),
                                    "flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                                )}
                            >
                                <Plus className="h-4 w-4" />
                                <span>New Center</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Center grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Center cards */}
                    {centerList.map((center) => (
                        <div
                            key={center.id}
                            className="flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer"
                            onClick={() => handleCenterClick(center.id)}
                        >
                            {/* Center Header */}
                            <div className="w-full h-32 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                                <School className="h-12 w-12 text-orange-600" />
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium">{center.name}</h3>
                                    {center.project && (
                                        <span className="text-xs text-muted-foreground bg-orange-50 px-2 py-1 rounded">
                                            {center.project.name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                                    <MapPin className="inline h-3 w-3 mr-1" />
                                    <span className="line-clamp-1">{center.address}</span>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center text-xs text-muted-foreground">
                                        <Clock className="mr-1 h-3 w-3" />
                                        <span>Updated {new Date(center.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {isAdmin() && (
                                            <Link
                                                to={`/projects/${projectId}/centers/${center.id}/edit`}
                                                className={cn(
                                                    buttonVariants({ variant: 'outline', size: 'sm' }),
                                                    'h-8 px-2'
                                                )}
                                                onClick={e => e.stopPropagation()}
                                                title="Edit Center"
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Link>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCenterClick(center.id);
                                            }}
                                            className={cn(
                                                buttonVariants({ size: 'sm' }),
                                                'h-8 px-3 bg-orange-600 hover:bg-orange-700 text-white'
                                            )}
                                        >
                                            Semesters
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No centers found message */}
                {centerList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10">
                        <MapPin className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                        <h3 className="font-medium text-lg">No centers found</h3>
                        <p className="text-sm text-muted-foreground">
                            {isAdmin() ? `Get started by creating the first center for ${project?.name || 'this project'}` : "No centers available to view"}
                        </p>
                        {isAdmin() && (
                            <Link
                                to={`/projects/${projectId}/centers/new`}
                                className={cn(
                                    buttonVariants({ size: "default" }),
                                    "mt-4 bg-orange-600 hover:bg-orange-700 text-white"
                                )}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Center
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default Centers;
