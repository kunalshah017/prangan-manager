import { Building2, Pencil, Plus } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { CentreList } from "@/components/workspace/CentreList";
import { PageTitle } from "@/components/navigation/PageTitle";
import { ExpandableText } from "@/components/workspace/ExpandableText";
import { EmptyState, ErrorState, ListPageSkeleton } from "@/components/workspace/PageState";
import { PrimaryAction } from "@/components/workspace/PrimaryAction";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { projectStatus, sortCentresByRecentUpdate } from "@/lib/workspace-display";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/hooks/useAuth";
import { useCentersByProject } from "@/hooks/useCenterQueries";
import { useProject } from "@/hooks/useProjectQueries";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default function ProjectDashboard() {
  const { projectId = "" } = useParams();
  const { isAdmin } = useAuth();
  const projectQuery = useProject(projectId);
  const centersQuery = useCentersByProject(projectId);
  const error = projectQuery.error || centersQuery.error;

  if (projectQuery.isLoading || centersQuery.isLoading) {
    return (
      <WorkspacePage>
        <ListPageSkeleton label="Loading project" hero />
      </WorkspacePage>
    );
  }

  if (error || !projectQuery.data) {
    return (
      <WorkspacePage>
        <ErrorState
          title="Project could not be loaded"
          description="Check your connection and try loading this project again."
          onRetry={() => void Promise.all([projectQuery.refetch(), centersQuery.refetch()])}
          backHref="/projects"
          backLabel="Back to projects"
        />
      </WorkspacePage>
    );
  }

  const project = projectQuery.data;
  const centres = sortCentresByRecentUpdate(centersQuery.data);

  return (
    // Phones read top to bottom: banner, details, centres. On desktop, centres sit
    // under the banner and details move to the side, as on the centre dashboard.
    <WorkspacePage
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-8"
      withMobileAction={isAdmin()}
    >
      <header className="lg:contents">
        <PageTitle title={project.name} />
        <div className="-mx-4 -mt-[3.75rem] aspect-[2/1] overflow-hidden bg-muted sm:mx-0 sm:mt-0 sm:aspect-[5/2] sm:rounded-xl lg:col-start-1 lg:row-start-1 lg:aspect-[21/9]">
          <img
            src={project.imageUrl || "/images/default_project_banner.jpg"}
            alt={`${project.name} project`}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="mt-3 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge {...projectStatus(project.status)} />
            {isAdmin() && (
              <Link
                to={`/projects/${projectId}/edit`}
                className={cn(buttonVariants({ variant: "outline" }), "min-h-11 shrink-0 gap-2")}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            )}
          </div>
          {project.description && (
            <div className="mt-2 max-w-prose text-[0.9375rem] leading-6 text-muted-foreground">
              <ExpandableText text={project.description} />
            </div>
          )}
        </div>
      </header>

      <section aria-labelledby="project-centres" className="space-y-3 lg:col-start-1 lg:row-start-2">
        <div className="flex items-end justify-between gap-3">
          <h2 id="project-centres" className="text-lg font-semibold text-foreground">
            Centres <span className="font-normal tabular-nums text-muted-foreground">{centres.length}</span>
          </h2>
          {isAdmin() && (
            <PrimaryAction
              to={`/projects/${projectId}/centers/new`}
              icon={<Plus className="h-5 w-5" aria-hidden="true" />}
            >
              New centre
            </PrimaryAction>
          )}
        </div>

        {centres.length > 0 ? (
          <CentreList projectId={projectId} centres={centres} />
        ) : (
          <EmptyState
            icon={Building2}
            title={isAdmin() ? "Add this project's first centre" : "No centres are available"}
            description={
              isAdmin()
                ? "Add a learning location, then create its first semester."
                : "Ask an administrator to add or assign a centre."
            }
          />
        )}
      </section>
    </WorkspacePage>
  );
}
