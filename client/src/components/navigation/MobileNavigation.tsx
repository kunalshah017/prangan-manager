import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";

import { NavItem } from "@/components/navigation/NavItem";
import { WorkspaceTree } from "@/components/navigation/WorkspaceTree";
import PWAInstallButton from "@/components/PWAInstallButton";
import { ProfilePicture } from "@/components/ui";
import type { NavigationModel } from "@/lib/navigation";
import type { Project, User } from "@/types/api";

interface MobileNavigationProps {
    open: boolean;
    onClose: () => void;
    projects: Project[];
    user: User | null | undefined;
    model: NavigationModel;
    canViewWorkspace: boolean;
    currentProjectId?: string;
    currentCenterId?: string;
    currentSemesterId?: string;
    onLogout: () => void;
}

export function MobileNavigation({
    open,
    onClose,
    projects,
    user,
    model,
    canViewWorkspace,
    currentProjectId,
    currentCenterId,
    currentSemesterId,
    onLogout,
}: MobileNavigationProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previouslyFocusedElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;

        previouslyFocusedElement.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.requestAnimationFrame(() => closeButtonRef.current?.focus());

        return () => {
            document.body.style.overflow = previousOverflow;
            previouslyFocusedElement.current?.focus();
        };
    }, [open]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
        }

        if (event.key !== "Tab" || !dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const standaloneResources = model.universal;

    return (
        <AnimatePresence>
            {open && (
                <div className="md:hidden">
                    <motion.button
                        type="button"
                        aria-label="Close navigation backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]"
                    />
                    <motion.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Application navigation"
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "tween", duration: 0.22 }}
                        onKeyDown={handleKeyDown}
                        className="fixed inset-y-0 left-0 z-50 grid w-[min(88vw,20rem)] grid-rows-[auto_minmax(0,1fr)_auto] border-r border-border bg-background shadow-2xl motion-reduce:transition-none"
                    >
                        <header className="flex items-center justify-between border-b border-border px-4 py-3">
                            <img src="/images/logo/prangan-logo-light-mode.png" alt="Prangan" className="h-8 w-auto" />
                            <button
                                ref={closeButtonRef}
                                type="button"
                                onClick={onClose}
                                aria-label="Close navigation menu"
                                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </header>

                        <div className="overflow-y-auto overscroll-contain px-3 py-4">
                            {canViewWorkspace && (
                                <section className="mb-6">
                                    <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Workspace</h2>
                                    <WorkspaceTree
                                        projects={projects}
                                        user={user}
                                        currentProjectId={currentProjectId}
                                        currentCenterId={currentCenterId}
                                        currentSemesterId={currentSemesterId}
                                        onNavigate={onClose}
                                        compact
                                    />
                                </section>
                            )}

                            {standaloneResources.length > 0 && (
                                <section className="mb-6">
                                    <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Resources</h2>
                                    {standaloneResources.map((item) => (
                                        <NavItem key={item.href} item={item} onNavigate={onClose} />
                                    ))}
                                </section>
                            )}

                            {model.administration.length > 0 && (
                                <section>
                                    <h2 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Administration</h2>
                                    {model.administration.map((item) => (
                                        <NavItem key={item.href} item={item} onNavigate={onClose} />
                                    ))}
                                </section>
                            )}
                        </div>

                        <footer className="border-t border-border bg-muted/30 p-4">
                            <div className="mb-3 flex items-center gap-3">
                                <ProfilePicture imageUrl={user?.profileImageUrl} name={user?.name || "User"} size="md" colorScheme="orange" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">{user?.name || "User"}</p>
                                    <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    to="/profile"
                                    onClick={onClose}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <UserRound className="h-4 w-4" aria-hidden="true" />
                                    Profile
                                </Link>
                                <Link
                                    to="/profile/settings"
                                    onClick={onClose}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Settings className="h-4 w-4" aria-hidden="true" />
                                    Settings
                                </Link>
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-2">
                                <button
                                    type="button"
                                    onClick={onLogout}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                                >
                                    <LogOut className="h-4 w-4" aria-hidden="true" />
                                    Sign out
                                </button>
                            </div>
                            <div className="mt-2"><PWAInstallButton /></div>
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
