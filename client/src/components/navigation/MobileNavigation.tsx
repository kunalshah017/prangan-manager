import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogOut, Settings, X } from "lucide-react";
import { Link } from "react-router-dom";

import { NavItem } from "@/components/navigation/NavItem";
import { WorkspaceTree } from "@/components/navigation/WorkspaceTree";
import PWAInstallButton from "@/components/PWAInstallButton";
import { ProfilePicture } from "@/components/ui";
import type { NavigationModel } from "@/lib/navigation";
import type { Project, User } from "@/types/api";
import { ThemedLogo } from "@/components/ThemedLogo";

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
                    {/* Invisible: tapping outside closes the menu and can't reach the page behind. */}
                    <button
                        type="button"
                        aria-label="Close navigation backdrop"
                        onClick={onClose}
                        className="fixed inset-0 z-50 cursor-default"
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
                        className="fixed inset-y-0 left-0 z-50 grid w-[min(88vw,20rem)] grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-x-hidden border-r border-border bg-background shadow-2xl motion-reduce:transition-none"
                    >
                        <header className="flex items-center justify-between border-b border-border px-4 py-3">
                            <ThemedLogo className="h-8" />
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

                        <div className="space-y-5 overflow-y-auto overscroll-contain px-3 py-4">
                            {canViewWorkspace && (
                                <section>
                                    <h2 className="mb-1 px-3 text-sm font-medium text-muted-foreground">Workspace</h2>
                                    <WorkspaceTree
                                        projects={projects}
                                        user={user}
                                        currentProjectId={currentProjectId}
                                        currentCenterId={currentCenterId}
                                        currentSemesterId={currentSemesterId}
                                        onNavigate={onClose}
                                    />
                                </section>
                            )}

                            {standaloneResources.length > 0 && (
                                <section>
                                    <h2 className="mb-1 px-3 text-sm font-medium text-muted-foreground">Resources</h2>
                                    {standaloneResources.map((item) => (
                                        <NavItem key={item.href} item={item} onNavigate={onClose} />
                                    ))}
                                </section>
                            )}

                            {model.administration.length > 0 && (
                                <section>
                                    <h2 className="mb-1 px-3 text-sm font-medium text-muted-foreground">Administration</h2>
                                    {model.administration.map((item) => (
                                        <NavItem key={item.href} item={item} onNavigate={onClose} />
                                    ))}
                                </section>
                            )}
                        </div>

                        {/* On phones this is the only place for account actions: the
                            bottom of the drawer is within thumb reach, the top-right
                            corner is not, so the header avatar menu is desktop-only. */}
                        <footer className="min-w-0 space-y-1 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            <Link
                                to="/profile"
                                onClick={onClose}
                                className="flex min-h-14 items-center gap-3 rounded-lg px-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                            >
                                <ProfilePicture imageUrl={user?.profileImageUrl} name={user?.name || "User"} size="md" colorScheme="orange" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-base font-semibold text-foreground">{user?.name || "User"}</span>
                                    <span className="block truncate text-sm text-muted-foreground">{user?.email || ""}</span>
                                </span>
                                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                            </Link>
                            <div className="grid grid-cols-2 gap-2 pt-1 [&>*]:min-w-0">
                                <Link
                                    to="/profile/settings"
                                    onClick={onClose}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                                >
                                    <Settings className="h-4 w-4" aria-hidden="true" />
                                    Settings
                                </Link>
                                <button
                                    type="button"
                                    onClick={onLogout}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-destructive/30 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive motion-reduce:transition-none"
                                >
                                    <LogOut className="h-4 w-4" aria-hidden="true" />
                                    Sign out
                                </button>
                            </div>
                            <PWAInstallButton />
                        </footer>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
