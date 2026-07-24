import {
  FolderKanban,
  Inbox,
  Layers3,
  Plus,
  RefreshCw,
  UserCog,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { DashboardMetric } from "@/components/dashboard/DashboardMetric";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import { useProjects } from "@/hooks/useProjectQueries";
import {
  useRegistrationRequests,
  useUsers,
} from "@/hooks/useUserQueries";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const actions = [
  {
    label: "People",
    description: "Manage portal access, roles, and assignments.",
    href: "/users",
    icon: UserCog,
  },
  {
    label: "Registration requests",
    description: "Review incoming applications and assign roles.",
    href: "/users?view=requests",
    icon: Inbox,
  },
  {
    label: "Academic levels",
    description: "Create levels and manage their learning sequence.",
    href: "/academic-levels",
    icon: Layers3,
  },
  {
    label: "Projects",
    description: "Open the project portfolio and create workspaces.",
    href: "/projects",
    icon: FolderKanban,
  },
];

export default function AdministrationDashboard() {
  const projectsQuery = useProjects();
  const usersQuery = useUsers();
  const requestsQuery = useRegistrationRequests();
  const isLoading =
    projectsQuery.isLoading || usersQuery.isLoading || requestsQuery.isLoading;
  const error = projectsQuery.error || usersQuery.error || requestsQuery.error;

  const retry = () =>
    Promise.all([
      projectsQuery.refetch(),
      usersQuery.refetch(),
      requestsQuery.refetch(),
    ]);

  if (isLoading) {
    return (
      <WorkspacePage>
        <div
          className="space-y-6 animate-pulse motion-reduce:animate-none"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="space-y-3 border-b border-border pb-6">
            <div className="h-9 w-64 rounded bg-muted" />
            <div className="h-5 w-full max-w-lg rounded bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 rounded-lg border border-border bg-card"
              />
            ))}
          </div>
          <span className="sr-only">Loading administration dashboard</span>
        </div>
      </WorkspacePage>
    );
  }

  if (error) {
    return (
      <WorkspacePage>
        <div
          className="flex min-h-[55dvh] items-center justify-center"
          aria-live="polite"
        >
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-7 text-center shadow-sm">
            <RefreshCw
              className="mx-auto h-6 w-6 text-destructive"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Administration could not be loaded
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Check your connection and reload the administration overview.
            </p>
            <button
              type="button"
              onClick={() => void retry()}
              className={cn(buttonVariants(), "mt-5 min-h-11 gap-2")}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </WorkspacePage>
    );
  }

  const projects = projectsQuery.data || [];
  const users = usersQuery.data || [];
  const requests = requestsQuery.data || [];

  return (
    <WorkspacePage className="space-y-6">
      <WorkspacePageHeader
        title="Administration"
        badge="App level"
        description="Manage the people, access rules, academic levels, and projects shared across Prangan."
      />

      <section aria-labelledby="administration-overview">
        <h2 id="administration-overview" className="sr-only">
          Administration overview
        </h2>
        <div className="grid rounded-lg border border-border bg-card px-4 shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-border sm:px-0">
          <div className="sm:px-5">
            <DashboardMetric
              label="Projects"
              value={projects.length}
              detail="Across the organisation"
              icon={FolderKanban}
            />
          </div>
          <div className="sm:px-5">
            <DashboardMetric
              label="People"
              value={users.length}
              detail="Portal accounts"
              icon={Users}
            />
          </div>
          <div className="sm:px-5">
            <DashboardMetric
              label="Pending"
              value={requests.length}
              detail="Registration requests"
              icon={Inbox}
            />
          </div>
        </div>
      </section>

      {projects.length === 0 && (
        <section
          aria-live="polite"
          className="flex flex-col gap-4 rounded-lg border border-dashed border-border bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="text-base font-semibold text-foreground">
              No projects yet
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Create the first project workspace, then add its centers.
            </p>
          </div>
          <Link
            to="/projects/new"
            className={cn(
              buttonVariants(),
              "min-h-11 w-full shrink-0 gap-2 sm:w-auto",
            )}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New project
          </Link>
        </section>
      )}

      <section aria-labelledby="administration-tools">
        <div className="mb-3">
          <h2
            id="administration-tools"
            className="text-lg font-semibold text-foreground"
          >
            Administration tools
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the area you want to manage.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {actions.map(({ label, description, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="group flex min-h-24 items-start gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/35 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  {label}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </WorkspacePage>
  );
}
