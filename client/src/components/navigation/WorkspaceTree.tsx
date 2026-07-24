import { useEffect, useState } from "react";
import {
    Building2,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    FolderOpen,
    MapPin,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useCentersByProject } from "@/hooks/useCenterQueries";
import { useSemestersByCenter } from "@/hooks/useSemesterQueries";
import { can } from "@/lib/access";
import { cn } from "@/lib/utils";
import type { Center, Project, User } from "@/types/api";

interface WorkspaceTreeProps {
    projects: Project[];
    user: User | null | undefined;
    currentProjectId?: string;
    currentCenterId?: string;
    currentSemesterId?: string;
    onNavigate?: () => void;
    compact?: boolean;
}

export function WorkspaceTree({
    projects,
    user,
    currentProjectId,
    currentCenterId,
    currentSemesterId,
    onNavigate,
    compact = false,
}: WorkspaceTreeProps) {
    return (
        <nav aria-label="Workspace hierarchy" className="space-y-1">
            <TreeLink
                href="/projects"
                label="All projects"
                icon={Building2}
                active={!currentProjectId}
                onNavigate={onNavigate}
                compact={compact}
            />
            {projects.map((project) => (
                <ProjectNode
                    key={project.id}
                    project={project}
                    user={user}
                    currentProjectId={currentProjectId}
                    currentCenterId={currentCenterId}
                    currentSemesterId={currentSemesterId}
                    onNavigate={onNavigate}
                    compact={compact}
                />
            ))}
        </nav>
    );
}

interface ProjectNodeProps extends Omit<WorkspaceTreeProps, "projects"> {
    project: Project;
}

function ProjectNode({
    project,
    user,
    currentProjectId,
    currentCenterId,
    currentSemesterId,
    onNavigate,
    compact = false,
}: ProjectNodeProps) {
    const isCurrent = currentProjectId === project.id;
    const [expanded, setExpanded] = useState(isCurrent);

    useEffect(() => {
        if (isCurrent) setExpanded(true);
    }, [isCurrent]);

    const { data: centers = [], isLoading } = useCentersByProject(project.id, expanded);
    const allowedCenters = centers.filter((center) =>
        can(user, 'workspace.view', { projectId: project.id, centerId: center.id }),
    );
    const controlsId = `workspace-project-${project.id}`;

    return (
        <div>
            <div className={cn("flex items-center rounded-md", isCurrent && "bg-accent/60")}>
                <TreeLink
                    href={`/projects/${project.id}/centers`}
                    label={project.name}
                    icon={FolderOpen}
                    active={isCurrent && !currentCenterId}
                    onNavigate={onNavigate}
                    compact={compact}
                    className="min-w-0 flex-1"
                />
                <DisclosureButton
                    expanded={expanded}
                    controlsId={controlsId}
                    label={`${expanded ? "Collapse" : "Expand"} ${project.name} centers`}
                    onClick={() => setExpanded((value) => !value)}
                />
            </div>
            {expanded && (
                <div id={controlsId} className="ml-4 border-l border-border pl-2">
                    {isLoading && <TreeLoading />}
                    {!isLoading && allowedCenters.length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No centers available</p>
                    )}
                    {allowedCenters.map((center) => (
                        <CenterNode
                            key={center.id}
                            center={center}
                            projectId={project.id}
                            user={user}
                            currentCenterId={currentCenterId}
                            currentSemesterId={currentSemesterId}
                            onNavigate={onNavigate}
                            compact={compact}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface CenterNodeProps {
    center: Center;
    projectId: string;
    user: User | null | undefined;
    currentCenterId?: string;
    currentSemesterId?: string;
    onNavigate?: () => void;
    compact?: boolean;
}

function CenterNode({
    center,
    projectId,
    user,
    currentCenterId,
    currentSemesterId,
    onNavigate,
    compact = false,
}: CenterNodeProps) {
    const isCurrent = currentCenterId === center.id;
    const [expanded, setExpanded] = useState(isCurrent);

    useEffect(() => {
        if (isCurrent) setExpanded(true);
    }, [isCurrent]);

    const { data: semesters = [], isLoading } = useSemestersByCenter(center.id, expanded);
    const allowedSemesters = semesters.filter((semester) =>
        can(user, 'workspace.view', {
            projectId,
            centerId: center.id,
            semesterId: semester.id,
        }),
    );
    const controlsId = `workspace-center-${center.id}`;

    return (
        <div>
            <div className={cn("flex items-center rounded-md", isCurrent && "bg-accent/60")}>
                <TreeLink
                    href={`/projects/${projectId}/centers/${center.id}/semesters`}
                    label={center.name}
                    icon={MapPin}
                    active={isCurrent && !currentSemesterId}
                    onNavigate={onNavigate}
                    compact={compact}
                    className="min-w-0 flex-1"
                />
                <DisclosureButton
                    expanded={expanded}
                    controlsId={controlsId}
                    label={`${expanded ? "Collapse" : "Expand"} ${center.name} semesters`}
                    onClick={() => setExpanded((value) => !value)}
                />
            </div>
            {expanded && (
                <div id={controlsId} className="ml-4 border-l border-border pl-2">
                    {isLoading && <TreeLoading />}
                    {!isLoading && allowedSemesters.length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No semesters available</p>
                    )}
                    {allowedSemesters.map((semester) => (
                        <TreeLink
                            key={semester.id}
                            href={`/projects/${projectId}/centers/${center.id}/semesters/${semester.id}/dashboard`}
                            label={semester.name}
                            icon={CalendarDays}
                            active={currentSemesterId === semester.id}
                            onNavigate={onNavigate}
                            compact={compact}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface TreeLinkProps {
    href: string;
    label: string;
    icon: typeof FolderOpen;
    active: boolean;
    onNavigate?: () => void;
    compact?: boolean;
    className?: string;
}

function TreeLink({ href, label, icon: Icon, active, onNavigate, compact, className }: TreeLinkProps) {
    const location = useLocation();
    const exactActive = active || location.pathname === href;

    return (
        <Link
            to={href}
            onClick={onNavigate}
            aria-current={exactActive ? "page" : undefined}
            className={cn(
                "relative flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                exactActive ? "text-foreground" : "text-muted-foreground",
                compact && "text-xs",
                className,
            )}
        >
            <span className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0", exactActive && "opacity-100")} aria-hidden="true" />
            <Icon className={cn("h-4 w-4 shrink-0", exactActive && "text-primary")} aria-hidden="true" />
            <span className="truncate">{label}</span>
        </Link>
    );
}

interface DisclosureButtonProps {
    expanded: boolean;
    controlsId: string;
    label: string;
    onClick: () => void;
}

function DisclosureButton({ expanded, controlsId, label, onClick }: DisclosureButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-expanded={expanded}
            aria-controls={controlsId}
            className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
    );
}

function TreeLoading() {
    return (
        <div className="space-y-2 px-3 py-2" aria-label="Loading workspace navigation">
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
    );
}
