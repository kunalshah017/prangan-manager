import {
  Building2,
  FolderOpen,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { DashboardMetric } from "@/components/dashboard/DashboardMetric";
import { ExpandableText } from "@/components/workspace/ExpandableText";
import { WorkspaceCard } from "@/components/workspace/WorkspaceCard";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/hooks/useAuth";
import { useCentersByProject } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { centerCardDestination } from "@/lib/workspace-hierarchy";

export default function ProjectDashboard() {
  const { projectId = "" } = useParams();
  const { isAdmin } = useAuth();
  const projectQuery = useProject(projectId);
  const centersQuery = useCentersByProject(projectId);
  const error = projectQuery.error || centersQuery.error;

  const retry = () =>
    Promise.all([projectQuery.refetch(), centersQuery.refetch()]);

  if (projectQuery.isLoading || centersQuery.isLoading) {
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
          <div className="h-28 rounded-lg border border-border bg-card" />
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-56 rounded-lg border border-border bg-card"
              />
            ))}
          </div>
          <span className="sr-only">Loading project dashboard</span>
        </div>
      </WorkspacePage>
    );
  }

  if (error || !projectQuery.data) {
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
              Project dashboard could not be loaded
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Check your connection and try loading this project again.
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

  const project = projectQuery.data;
  const centers = [...(centersQuery.data || [])].sort(
    (first, second) =>
      Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
  );
  return (
    <WorkspacePage className="space-y-5 sm:space-y-6">
      <WorkspacePageHeader
        title={project.name}
        badge="Project"
        compact
        description={
          <ExpandableText
            text={
              project.description ||
              "Manage this project's centers and open their workspaces."
            }
          />
        }
        action={
          isAdmin() ? (
            <div className="flex w-full gap-2 sm:w-auto">
              <Link
                to={`/projects/${projectId}/edit`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-11 flex-1 gap-2 sm:flex-none",
                )}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
              <Link
                to={`/projects/${projectId}/centers/new`}
                className={cn(
                  buttonVariants(),
                  "min-h-11 flex-1 gap-2 sm:flex-none",
                )}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New center
              </Link>
            </div>
          ) : undefined
        }
      />

      <section
        aria-label="Project overview"
        className="grid grid-cols-2 divide-x divide-border rounded-lg border border-border bg-card shadow-sm"
      >
        <div className="px-3 sm:px-5">
          <DashboardMetric
            compact
            label="Centers"
            value={centers.length}
            detail="Learning locations"
            icon={Building2}
          />
        </div>
        <div className="px-3 sm:px-5">
          <DashboardMetric
            compact
            label="Status"
            value={project.status === "ACTIVE" ? "Active" : "Inactive"}
            detail="Project availability"
            icon={FolderOpen}
          />
        </div>
      </section>

      <section aria-labelledby="project-centers">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <div>
            <h2
              id="project-centers"
              className="text-lg font-semibold text-foreground sm:text-xl"
            >
              Centers
            </h2>
            <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
              Open a center dashboard to manage its semesters.
            </p>
          </div>
          <Link
            to={`/projects/${projectId}/centers`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-11 shrink-0",
            )}
          >
            View all centers
          </Link>
        </div>

        {centers.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {centers.map((center) => (
              <WorkspaceCard
                key={center.id}
                title={center.name}
                entityLabel="Center"
                mediaSrc="/images/default_center_banner.jpg"
                mediaAlt={`${center.name} learning center`}
                href={centerCardDestination(projectId, center.id)}
                openLabel="Open center"
                detail={
                  <div className="flex items-start gap-2">
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="line-clamp-2">
                      {center.address || "Address not added"}
                    </span>
                  </div>
                }
                updatedAt={new Date(center.updatedAt).toLocaleDateString(
                  "en-GB",
                )}
                editHref={
                  isAdmin()
                    ? `/projects/${projectId}/centers/${center.id}/edit`
                    : undefined
                }
                editLabel={
                  isAdmin() ? `Edit ${center.name}` : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center"
            aria-live="polite"
          >
            <Building2
              className="mx-auto h-7 w-7 text-primary"
              aria-hidden="true"
            />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {isAdmin()
                ? "Create this project's first center"
                : "No centers are available"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {isAdmin()
                ? "Add a learning location, then create its semester workspace."
                : "Ask an administrator to add or assign a center."}
            </p>
            {isAdmin() && (
              <Link
                to={`/projects/${projectId}/centers/new`}
                className={cn(buttonVariants(), "mt-5 min-h-11 gap-2")}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create center
              </Link>
            )}
          </div>
        )}
      </section>
    </WorkspacePage>
  );
}
