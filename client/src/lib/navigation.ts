import type { User } from "@/types/api";

export type NavigationIcon =
  | "layout-dashboard"
  | "graduation-cap"
  | "book-open"
  | "clipboard-list"
  | "calendar-check"
  | "calendar-days"
  | "users"
  | "user-check"
  | "wallet-cards"
  | "library"
  | "layers"
  | "user-cog"
  | "inbox";

export interface NavigationContext {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
}

export const getNavigationContextFromPathname = (
  pathname: string,
): NavigationContext => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "projects") return {};

  const projectId = segments[1];
  if (!projectId || projectId === "new") return {};

  const context: NavigationContext = { projectId };
  if (segments[2] !== "centers") return context;

  const centerId = segments[3];
  if (!centerId || centerId === "new") return context;
  context.centerId = centerId;
  if (segments[4] !== "semesters") return context;

  const semesterId = segments[5];
  if (!semesterId || semesterId === "new") return context;
  context.semesterId = semesterId;
  return context;
};

const administrationPathPrefixes = [
  "/administration",
  "/academic-levels",
  "/users",
  "/registration-requests",
] as const;

export const isAdministrationPathActive = (pathname: string): boolean =>
  administrationPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export interface NavigationLink {
  label: string;
  href: string;
  icon: NavigationIcon;
}

export interface NavigationModel {
  administration: NavigationLink[];
  universal: NavigationLink[];
}

export const buildNavigationModel = (
  user: User | null | undefined,
): NavigationModel => {
  return {
    administration:
      user?.role === "ADMIN"
        ? [
            {
              label: "Administration",
              href: "/administration",
              icon: "layout-dashboard",
            },
            { label: "Levels", href: "/academic-levels", icon: "layers" },
            { label: "People", href: "/users", icon: "user-cog" },
          ]
        : [],
    universal: [{ label: "Library", href: "/library", icon: "library" }],
  };
};
