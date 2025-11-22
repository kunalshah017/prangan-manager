import React from 'react';
import { Link } from 'react-router-dom';
import { useCentersByProject } from '@/hooks/useCenterQueries';
import { useSemestersByCenter } from '@/hooks/useSemesterQueries';
import type { Project, Center, Semester } from '@/types/api';

interface ProjectNavigationProps {
    project: Project;
    currentProjectId?: string;
    currentCenterId?: string;
    currentSemesterId?: string;
    onNavigate?: () => void;
    isMobile?: boolean;
}

export const ProjectNavigation: React.FC<ProjectNavigationProps> = ({
    project,
    currentProjectId,
    currentCenterId,
    currentSemesterId,
    onNavigate,
    isMobile = false,
}) => {
    const { data: centers = [] } = useCentersByProject(project.id);
    const [expandedCenters, setExpandedCenters] = React.useState<Set<string>>(new Set());

    // Auto-expand current center
    React.useEffect(() => {
        if (currentProjectId === project.id && currentCenterId) {
            setExpandedCenters(prev => new Set(prev).add(currentCenterId));
        }
    }, [currentProjectId, currentCenterId, project.id]);

    const toggleCenter = (centerId: string) => {
        setExpandedCenters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(centerId)) {
                newSet.delete(centerId);
            } else {
                newSet.add(centerId);
            }
            return newSet;
        });
    };

    return (
        <div>
            <Link
                to={`/projects/${project.id}/centers`}
                onClick={onNavigate}
                className={`flex w-full items-center ${isMobile ? 'px-3 py-1.5 rounded-md text-xs' : 'px-4 py-2 text-sm'} hover:bg-accent`}
            >
                <span className="truncate">{isMobile ? `📁 ${project.name}` : project.name}</span>
            </Link>
            {centers.length > 0 && (
                <div className={isMobile ? 'pl-3 space-y-1' : 'pl-6 bg-gray-50'}>
                    {centers.map((center) => (
                        <CenterNavigation
                            key={center.id}
                            center={center}
                            projectId={project.id}
                            currentCenterId={currentCenterId}
                            currentSemesterId={currentSemesterId}
                            onNavigate={onNavigate}
                            isMobile={isMobile}
                            isExpanded={expandedCenters.has(center.id)}
                            onToggle={() => toggleCenter(center.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface CenterNavigationProps {
    center: Center;
    projectId: string;
    currentCenterId?: string;
    currentSemesterId?: string;
    onNavigate?: () => void;
    isMobile?: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}

const CenterNavigation: React.FC<CenterNavigationProps> = ({
    center,
    projectId,
    onNavigate,
    isMobile = false,
    isExpanded,
    onToggle,
}) => {
    const { data: semesters = [] } = useSemestersByCenter(center.id);

    const handleCenterClick = (e: React.MouseEvent) => {
        if (semesters.length > 0) {
            e.preventDefault();
            onToggle();
        }
    };

    return (
        <div>
            <Link
                to={`/projects/${projectId}/centers/${center.id}/semesters`}
                onClick={(e) => {
                    handleCenterClick(e);
                    if (semesters.length === 0) {
                        onNavigate?.();
                    }
                }}
                className={`flex w-full items-center justify-between ${isMobile ? 'px-3 py-1.5 rounded-md text-xs' : 'px-4 py-1.5 text-xs'} hover:bg-accent`}
            >
                <span className="truncate">📍 {center.name}</span>
                {semesters.length > 0 && (
                    <span className="text-xs ml-2">{isExpanded ? '▼' : '▶'}</span>
                )}
            </Link>
            {isExpanded && semesters.length > 0 && (
                <div className={isMobile ? 'pl-3 space-y-1' : 'pl-6 bg-gray-100'}>
                    {semesters.map((semester: Semester) => (
                        <div key={semester.id}>
                            <Link
                                to={`/projects/${projectId}/centers/${center.id}/semesters/${semester.id}/dashboard`}
                                onClick={onNavigate}
                                className={`flex w-full items-center ${isMobile ? 'px-3 py-1.5 rounded-md text-xs' : 'px-4 py-1.5 text-xs'} hover:bg-accent`}
                            >
                                <span className="truncate">📅 {semester.name}</span>
                            </Link>
                            <Link
                                to={`/projects/${projectId}/centers/${center.id}/semesters/${semester.id}/dashboard/students`}
                                onClick={onNavigate}
                                className={`flex w-full items-center ${isMobile ? 'px-3 py-1 rounded-md text-xs' : 'px-4 py-1 text-xs'} hover:bg-accent text-gray-600`}
                            >
                                <span className="truncate ml-4">👥 Students</span>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
