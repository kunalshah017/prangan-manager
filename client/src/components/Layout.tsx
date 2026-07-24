import { useEffect, useRef, useState } from "react";
import {
    ChevronDown,
    FolderOpen,
    LogOut,
    Menu,
    Settings,
    ShieldCheck,
    User,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import BreadcrumbNavigation from "@/components/BreadcrumbNavigation";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { NavItem } from "@/components/navigation/NavItem";
import { WorkspaceTree } from "@/components/navigation/WorkspaceTree";
import PWAInstallButton from "@/components/PWAInstallButton";
import { ProfilePicture } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjectQueries";
import { can } from "@/lib/access";
import {
    buildNavigationModel,
    getNavigationContextFromPathname,
    isAdministrationPathActive,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [administrationOpen, setAdministrationOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const workspaceRef = useRef<HTMLDivElement>(null);
    const administrationRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const { data: projects = [] } = useProjects();
    const canViewWorkspace = can(user, "workspace.view");
    const visibleProjects = projects.filter((project) =>
        can(user, "workspace.view", { projectId: project.id }),
    );

    const {
        projectId: currentProjectId,
        centerId: currentCenterId,
        semesterId: currentSemesterId,
    } = getNavigationContextFromPathname(location.pathname);
    const navigationModel = buildNavigationModel(user);

    const closeDesktopMenus = () => {
        setWorkspaceOpen(false);
        setAdministrationOpen(false);
        setProfileOpen(false);
    };

    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (workspaceRef.current && !workspaceRef.current.contains(target)) setWorkspaceOpen(false);
            if (administrationRef.current && !administrationRef.current.contains(target)) setAdministrationOpen(false);
            if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeDesktopMenus();
                setMobileOpen(false);
            }
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    useEffect(() => {
        closeDesktopMenus();
        setMobileOpen(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

    return (
        <div className="flex min-h-[100dvh] flex-col bg-background">
            <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-3 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        className="mr-2 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                        aria-label="Open navigation menu"
                    >
                        <Menu className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <Link to="/" className="mr-7 flex items-center" aria-label="Prangan home">
                        <img src="/images/logo/prangan-logo-light-mode.png" alt="Prangan" className="h-8 w-auto" />
                    </Link>

                    <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex" aria-label="Primary navigation">
                        {canViewWorkspace && (
                            <DesktopDisclosure
                                label="Workspace"
                                icon={FolderOpen}
                                open={workspaceOpen}
                                onToggle={() => {
                                    const nextOpen = !workspaceOpen;
                                    closeDesktopMenus();
                                    setWorkspaceOpen(nextOpen);
                                }}
                                panelId="workspace-navigation-panel"
                                panelRef={workspaceRef}
                                active={location.pathname.startsWith("/projects")}
                            >
                                <PanelHeader title="Workspace" description="Switch projects, centers, and semesters." />
                                <div className="max-h-[min(70vh,32rem)] overflow-y-auto p-2">
                                    <WorkspaceTree
                                        projects={visibleProjects}
                                        user={user}
                                        currentProjectId={currentProjectId}
                                        currentCenterId={currentCenterId}
                                        currentSemesterId={currentSemesterId}
                                        compact
                                    />
                                </div>
                            </DesktopDisclosure>
                        )}

                        <NavItem item={navigationModel.universal[0]} />

                        {navigationModel.administration.length > 0 && (
                            <DesktopDisclosure
                                label="Administration"
                                icon={ShieldCheck}
                                open={administrationOpen}
                                onToggle={() => {
                                    const nextOpen = !administrationOpen;
                                    closeDesktopMenus();
                                    setAdministrationOpen(nextOpen);
                                }}
                                panelId="administration-panel"
                                panelRef={administrationRef}
                                active={isAdministrationPathActive(location.pathname)}
                                narrow
                            >
                                <PanelHeader title="Administration" description="Manage people and access requests." />
                                <div className="space-y-0.5 p-2">
                                    {navigationModel.administration.map((item) => (
                                        <NavItem key={item.href} item={item} compact />
                                    ))}
                                </div>
                            </DesktopDisclosure>
                        )}
                    </nav>

                    <div ref={profileRef} className="relative ml-auto">
                        <button
                            type="button"
                            onClick={() => {
                                closeDesktopMenus();
                                setProfileOpen((value) => !value);
                            }}
                            aria-expanded={profileOpen}
                            aria-controls="profile-navigation-panel"
                            className="flex min-h-11 items-center gap-2 rounded-full border border-transparent px-1.5 text-sm transition-colors hover:border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <ProfilePicture imageUrl={user?.profileImageUrl} name={user?.name || "User"} size="md" colorScheme="orange" />
                            <span className="hidden max-w-32 truncate font-medium md:block">{user?.name || "User"}</span>
                            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", profileOpen && "rotate-180")} aria-hidden="true" />
                        </button>

                        {profileOpen && (
                            <motion.div
                                id="profile-navigation-panel"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
                            >
                                <div className="border-b border-border bg-muted/30 px-4 py-3">
                                    <p className="truncate text-sm font-semibold">{user?.name || "User"}</p>
                                    <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
                                </div>
                                <div className="p-2">
                                    <ProfileLink to="/profile" icon={User} label="Profile" />
                                    <ProfileLink to="/profile/settings" icon={Settings} label="Settings" />
                                    <PWAInstallButton />
                                    <button
                                        type="button"
                                        onClick={() => void handleLogout()}
                                        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                                    >
                                        <LogOut className="h-4 w-4" aria-hidden="true" />
                                        Sign out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </header>

            <MobileNavigation
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                projects={visibleProjects}
                user={user}
                model={navigationModel}
                canViewWorkspace={canViewWorkspace}
                currentProjectId={currentProjectId}
                currentCenterId={currentCenterId}
                currentSemesterId={currentSemesterId}
                onLogout={() => void handleLogout()}
            />

            <main className="flex flex-1 justify-center">
                <div className="w-full max-w-7xl px-4 pb-5 pt-3 sm:px-6 sm:pb-7 sm:pt-4 lg:px-8">
                    <div className="w-full overflow-hidden"><BreadcrumbNavigation /></div>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

interface DesktopDisclosureProps {
    label: string;
    icon: typeof FolderOpen;
    open: boolean;
    onToggle: () => void;
    panelId: string;
    panelRef: React.RefObject<HTMLDivElement | null>;
    active: boolean;
    narrow?: boolean;
    children: React.ReactNode;
}

function DesktopDisclosure({ label, icon: Icon, open, onToggle, panelId, panelRef, active, narrow, children }: DesktopDisclosureProps) {
    return (
        <div ref={panelRef} className="relative">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={panelId}
                className={cn(
                    "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "bg-accent/70 text-foreground" : "text-muted-foreground",
                )}
            >
                <Icon className={cn("h-4 w-4", active && "text-primary")} aria-hidden="true" />
                {label}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
            </button>
            {open && (
                <motion.div
                    id={panelId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl",
                        narrow ? "w-72" : "w-[22.5rem]",
                    )}
                >
                    {children}
                </motion.div>
            )}
        </div>
    );
}

function PanelHeader({ title, description }: { title: string; description: string }) {
    return (
        <div className="border-b border-border bg-muted/30 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
    );
}

function ProfileLink({ to, icon: Icon, label }: { to: string; icon: typeof User; label: string }) {
    return (
        <Link to={to} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
        </Link>
    );
}

export default Layout;
