import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Settings, PanelRightOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import BreadcrumbNavigation from '@/components/BreadcrumbNavigation';
import PWAInstallButton from '@/components/PWAInstallButton';
import { ProfilePicture } from '@/components/ui';


const Layout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = React.useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
                        <Link
                            to="/projects"
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                location.pathname === '/projects'
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            )}
                        >
                            Projects
                        </Link>
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
                                    <Link
                                        to="/settings"
                                        className="flex w-full items-center px-4 py-2 text-sm hover:bg-accent"
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
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
                            <nav className="p-4 space-y-2">
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
                                    Projects
                                </Link>
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
                                    <Link
                                        to="/settings"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex w-full items-center px-2 py-1.5 text-sm hover:bg-accent rounded-md"
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Settings
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