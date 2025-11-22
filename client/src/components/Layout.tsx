import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, PanelRightOpen, X, Users, UserCog, GraduationCap, Building2, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { hasPermission } from '@/lib/permissions';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import PWAInstallButton from '@/components/PWAInstallButton';
import { ProfilePicture } from '@/components/ui';
import { useProjects } from '@/hooks/useProjectQueries';
import { ProjectNavigation } from '@/components/ProjectNavigation';


const Layout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = React.useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [projectsMenuOpen, setProjectsMenuOpen] = React.useState(false);
    const [managementMenuOpen, setManagementMenuOpen] = React.useState(false);

    // Fetch user's projects
    const { data: projects = [] } = useProjects();

    // Get current context from URL
    const pathParts = location.pathname.split('/');
    const currentProjectId = pathParts[2];
    const currentCenterId = pathParts[4];
    const currentSemesterId = pathParts[6];    // Check if user can view registration requests
    const canViewRegistrationRequests = hasPermission(user, [], [], true);

    // Check user permissions for management links
    const canManageUsers = user?.role === 'ADMIN';
    const canViewStudents = user && (
        user.role === 'ADMIN' ||
        user.roleAssignments?.some(ra =>
            ra.isActive &&
            (ra.subRole === 'CENTER_MANAGER' || ra.subRole === 'EDUCATOR' || ra.subRole === 'CURRICULUM_MENTOR')
        )
    );

    // Refs for dropdown menus
    const projectsMenuRef = React.useRef<HTMLDivElement>(null);
    const managementMenuRef = React.useRef<HTMLDivElement>(null);

    // Handle logout
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Close the user menu when clicking outside
    const userMenuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
            if (projectsMenuRef.current && !projectsMenuRef.current.contains(event.target as Node)) {
                setProjectsMenuOpen(false);
            }
            if (managementMenuRef.current && !managementMenuRef.current.contains(event.target as Node)) {
                setManagementMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Close user menu when route changes
    React.useEffect(() => {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
        setProjectsMenuOpen(false);
        setManagementMenuOpen(false);
    }, [location]);

    return (
        <div className="min-h-[100dvh] flex flex-col bg-background">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 w-full px-2 flex justify-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="mr-3 md:hidden flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"
                        aria-label="Toggle navigation menu"
                    >
                        <PanelRightOpen className="h-5 w-5 text-gray-600" />
                    </button>

                    {/* Logo */}
                    <Link to="/" className="mr-6 flex items-center space-x-2">
                        <img
                            src="/images/logo/prangan-logo-light-mode.png"
                            alt="Prangan Logo"
                            className="h-8"
                        />
                    </Link>

                    {/* Main Navigation */}
                    <nav className="hidden md:flex flex-1 items-center space-x-4 lg:space-x-6">
                        {/* Projects Dropdown */}
                        <div className="relative" ref={projectsMenuRef}>
                            <button
                                onClick={() => setProjectsMenuOpen(!projectsMenuOpen)}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                                    location.pathname.startsWith('/projects')
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                <FolderOpen className="h-4 w-4" />
                                My Workspace
                                <ChevronDown className="h-3 w-3" />
                            </button>

                            {projectsMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    className="absolute left-0 mt-1 w-64 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-y-auto z-50"
                                >
                                    <Link
                                        to="/projects"
                                        className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent font-medium text-gray-700"
                                    >
                                        <Building2 className="mr-2 h-4 w-4" />
                                        All Projects
                                    </Link>
                                    {projects.length > 0 && (
                                        <>
                                            <div className="border-t my-1"></div>
                                            {projects.map((project) => (
                                                <ProjectNavigation
                                                    key={project.id}
                                                    project={project}
                                                    currentProjectId={currentProjectId}
                                                    currentCenterId={currentCenterId}
                                                    currentSemesterId={currentSemesterId}
                                                    isMobile={false}
                                                />
                                            ))}
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Management Dropdown */}
                        {(canManageUsers || canViewStudents) && (
                            <div className="relative" ref={managementMenuRef}>
                                <button
                                    onClick={() => setManagementMenuOpen(!managementMenuOpen)}
                                    className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-1 text-muted-foreground"
                                >
                                    <UserCog className="h-4 w-4" />
                                    Manage
                                    <ChevronDown className="h-3 w-3" />
                                </button>

                                {managementMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 8 }}
                                        className="absolute left-0 mt-1 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                                    >
                                        {canManageUsers && (
                                            <Link
                                                to="/users"
                                                className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent"
                                            >
                                                <Users className="mr-2 h-4 w-4" />
                                                Manage Users
                                            </Link>
                                        )}
                                        {canViewStudents && currentSemesterId && (
                                            <Link
                                                to={`/projects/${currentProjectId}/centers/${currentCenterId}/semesters/${currentSemesterId}/dashboard/students`}
                                                className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent"
                                            >
                                                <GraduationCap className="mr-2 h-4 w-4" />
                                                Manage Students
                                            </Link>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        )}

                        <Link
                            to="/library"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                location.pathname.startsWith('/library')
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            )}
                        >
                            Library
                        </Link>
                        {canViewRegistrationRequests && (
                            <Link
                                to="/registration-requests"
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    location.pathname === '/registration-requests'
                                        ? "text-foreground"
                                        : "text-muted-foreground"
                                )}
                            >
                                Registration Requests
                            </Link>
                        )}
                    </nav>

                    {/* PWA Install Button & User Menu */}
                    <div className="ml-auto flex items-center space-x-2" ref={userMenuRef}>
                        <PWAInstallButton />
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center space-x-1 rounded-full bg-background p-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                                <ProfilePicture
                                    imageUrl={user?.profileImageUrl}
                                    name={user?.name || 'User'}
                                    size="md"
                                    colorScheme="orange"
                                />
                                <span className="hidden md:inline-flex text-sm font-medium">
                                    {user?.name || 'User'}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </button>

                            {userMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    className="absolute right-0 mt-1 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                                >
                                    <div className="px-4 py-2 border-b">
                                        <p className="text-sm font-medium">{user?.name || 'User'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                                    </div>
                                    <Link
                                        to="/profile"
                                        className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent"
                                    >
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-accent"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign out
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation Sidebar */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 z-50 bg-black/50 md:hidden"
                        />

                        {/* Sliding Panel */}
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'tween', duration: 0.3 }}
                            className="fixed left-0 top-0 z-50 h-full w-64 bg-background border-r shadow-lg md:hidden"
                        >
                            {/* Mobile Menu Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <img
                                    src="/images/logo/prangan-logo-light-mode.png"
                                    alt="Prangan Logo"
                                    className="h-6"
                                />
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"
                                    aria-label="Close navigation menu"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Mobile Navigation Links */}
                            <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                                {/* Projects Section */}
                                <div className="space-y-1">
                                    <Link
                                        to="/projects"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                            "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent",
                                            location.pathname === '/projects'
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Building2 className="mr-2 h-4 w-4" />
                                        All Projects
                                    </Link>
                                    {projects.length > 0 && (
                                        <div className="pl-3 space-y-1">
                                            {projects.map((project) => (
                                                <ProjectNavigation
                                                    key={project.id}
                                                    project={project}
                                                    currentProjectId={currentProjectId}
                                                    currentCenterId={currentCenterId}
                                                    currentSemesterId={currentSemesterId}
                                                    onNavigate={() => setMobileMenuOpen(false)}
                                                    isMobile={true}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Management Section */}
                                {(canManageUsers || canViewStudents) && (
                                    <div className="border-t pt-2 mt-2 space-y-1">
                                        <div className="px-3 py-1 text-xs font-semibold text-gray-500">MANAGE</div>
                                        {canManageUsers && (
                                            <Link
                                                to="/users"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-accent"
                                            >
                                                <Users className="mr-2 h-4 w-4" />
                                                Users
                                            </Link>
                                        )}
                                        {canViewStudents && currentSemesterId && (
                                            <Link
                                                to={`/projects/${currentProjectId}/centers/${currentCenterId}/semesters/${currentSemesterId}/dashboard/students`}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-accent"
                                            >
                                                <GraduationCap className="mr-2 h-4 w-4" />
                                                Students
                                            </Link>
                                        )}
                                    </div>
                                )}

                                <Link
                                    to="/library"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent",
                                        location.pathname.startsWith('/library')
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Library
                                </Link>
                                {canViewRegistrationRequests && (
                                    <Link
                                        to="/registration-requests"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                            "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent",
                                            location.pathname === '/registration-requests'
                                                ? "bg-accent text-accent-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Registration Requests
                                    </Link>
                                )}
                            </nav>

                            {/* Mobile User Section */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                                <div className="flex items-center space-x-3 mb-3">
                                    <ProfilePicture
                                        imageUrl={user?.profileImageUrl}
                                        name={user?.name || 'User'}
                                        size="md"
                                        colorScheme="orange"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <PWAInstallButton />
                                </div>
                                <div className="space-y-1">
                                    <Link
                                        to="/profile"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent rounded-md"
                                    >
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="flex w-full items-center px-2 py-1.5 text-sm text-red-600 hover:bg-accent rounded-md"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 flex justify-center">
                <div className="w-full max-w-6xl px-2 sm:px-4 md:px-8 py-4 md:py-8">
                    <div className="w-full overflow-hidden">
                        <BreadcrumbNavigation />
                    </div>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;