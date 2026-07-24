import {
  ArrowRight,
  CalendarDays,
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
import { useCenter } from "@/hooks/useCenterQueries";
import { useSemestersByCenter } from "@/hooks/useSemesterQueries";
import { useSemesterSetupSummaries } from "@/hooks/useSemesterTransitionQueries";
import { buttonVariants } from "@/lib/button-variants";
import {
  mergeDraftSetupSummaries,
  normalizeSetupProgress,
} from "@/lib/semester-setup-summary";
import { cn } from "@/lib/utils";
import {
  orderWorkspaceSemesters,
  semesterCardDestination,
} from "@/lib/workspace-hierarchy";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

function SetupProgress({
  label,
  resolved,
  total,
}: {
  label: string;
  resolved: number;
  total: number;
}) {
  const {
    resolved: normalizedResolved,
    total: normalizedTotal,
    percentage,
  } = normalizeSetupProgress(resolved, total);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {normalizedResolved}/{normalizedTotal}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label}: ${normalizedResolved} of ${normalizedTotal} complete`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function CenterDashboard() {
  const { projectId = "", centerId = "" } = useParams();
  const { isAdmin } = useAuth();
  const canManageCenter = isAdmin();
  const centerQuery = useCenter(centerId);
  const semestersQuery = useSemestersByCenter(centerId);
  const setupSummariesQuery = useSemesterSetupSummaries(
    centerId,
    canManageCenter,
  );
  const error = centerQuery.error || semestersQuery.error;

  const retry = () =>
    Promise.all([centerQuery.refetch(), semestersQuery.refetch()]);

  if (centerQuery.isLoading || semestersQuery.isLoading) {
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
          <span className="sr-only">Loading center dashboard</span>
        </div>
      </WorkspacePage>
    );
  }

  if (error || !centerQuery.data) {
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
              Center dashboard could not be loaded
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Check your connection and try loading this center again.
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

  const center = centerQuery.data;
  const semesters = orderWorkspaceSemesters(semestersQuery.data || []);
  const setupSummaries = setupSummariesQuery.data || [];
  const draftSummaries = mergeDraftSetupSummaries(semesters, setupSummaries);
  const availableSemesters = semesters.filter(
    (semester) => semester.status !== "DRAFT",
  );
  const activeCount = semesters.filter(
    (semester) => semester.status === "ACTIVE",
  ).length;
  const draftCount = canManageCenter ? draftSummaries.length : 0;
  return (
    <WorkspacePage className="space-y-5 sm:space-y-6">
      <WorkspacePageHeader
        title={center.name}
        badge="Center"
        compact
        description={
          <ExpandableText
            text={center.address || "Address not added"}
            collapseAfter={70}
            leadingIcon={
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
            }
          />
        }
        action={
          canManageCenter ? (
            <div className="flex w-full gap-2 sm:w-auto">
              <Link
                to={`/projects/${projectId}/centers/${centerId}/edit`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "min-h-11 flex-1 gap-2 sm:flex-none",
                )}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
              <Link
                to={`/projects/${projectId}/centers/${centerId}/semesters/new`}
                className={cn(
                  buttonVariants(),
                  "min-h-11 flex-1 gap-2 sm:flex-none",
                )}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New semester
              </Link>
            </div>
          ) : undefined
        }
      />

      {canManageCenter && draftCount > 0 && (
        <section
          aria-labelledby="resume-semester-setup"
          className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Action needed
              </p>
              <h2
                id="resume-semester-setup"
                className="mt-1 text-xl font-semibold text-foreground"
              >
                Resume semester setup
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Finish student, staff, and remuneration decisions before
                activation.
              </p>
            </div>
            <Link
              to={`/projects/${projectId}/centers/${centerId}/semesters/new`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "min-h-10 w-full bg-background sm:w-auto",
              )}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New semester
            </Link>
          </div>

          {setupSummariesQuery.isLoading ? (
            <div
              className="grid gap-3 lg:grid-cols-2"
              aria-live="polite"
              aria-busy="true"
            >
              {draftSummaries.map((summary) => (
                <div
                  key={summary.semester.id}
                  className="h-40 animate-pulse rounded-lg border border-border bg-card motion-reduce:animate-none"
                />
              ))}
              <span className="sr-only">
                Loading semester setup progress
              </span>
            </div>
          ) : setupSummariesQuery.isError ? (
            <div
              className="flex flex-col gap-3 rounded-lg border border-destructive/25 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              role="alert"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  Setup progress could not be loaded
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Your draft semesters are unchanged. Try the summary again.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void setupSummariesQuery.refetch()}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "min-h-10 shrink-0 gap-2",
                )}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry progress
              </button>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {draftSummaries.map((summary) => (
                <article
                  key={summary.semester.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary">
                        Draft semester
                      </p>
                      <h3 className="mt-1 truncate text-base font-semibold text-foreground">
                        {summary.semester.name}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {summary.sourceSemester
                          ? `Continuing from ${summary.sourceSemester.name}`
                          : "Starting without a previous semester"}
                      </p>
                    </div>
                    <Link
                      to={semesterCardDestination(
                        projectId,
                        centerId,
                        summary.semester,
                      )}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "min-h-10 shrink-0 gap-1.5",
                      )}
                    >
                      Continue setup
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  {summary.progressAvailable ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <SetupProgress
                        label="Students"
                        {...summary.progress.students}
                      />
                      <SetupProgress
                        label="Staff"
                        {...summary.progress.staff}
                      />
                      <SetupProgress
                        label="Rates"
                        {...summary.progress.rates}
                      />
                    </div>
                  ) : (
                    <div
                      role="status"
                      className="mt-4 rounded-md bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground"
                    >
                      Progress unavailable. Continue setup to review the draft.
                    </div>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    Updated{" "}
                    {new Date(summary.updatedAt).toLocaleDateString("en-GB")}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section
        aria-label="Center overview"
        className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-card shadow-sm"
      >
        <div className="px-2 sm:px-5">
          <DashboardMetric
            compact
            label="Semesters"
            value={semesters.length}
            detail="All center workspaces"
            icon={CalendarDays}
          />
        </div>
        <div className="px-2 sm:px-5">
          <DashboardMetric
            compact
            label="Active"
            value={activeCount}
            detail="Currently running"
            icon={CalendarDays}
          />
        </div>
        <div className="px-2 sm:px-5">
          <DashboardMetric
            compact
            label="Drafts"
            value={draftCount}
            detail="Awaiting setup"
            icon={Pencil}
          />
        </div>
      </section>

      <section aria-labelledby="center-semesters">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <div>
            <h2
              id="center-semesters"
              className="text-lg font-semibold text-foreground sm:text-xl"
            >
              Semesters
            </h2>
            <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
              Drafts continue setup; active semesters open their workspace.
            </p>
          </div>
          <Link
            to={`/projects/${projectId}/centers/${centerId}/semesters`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "min-h-11 shrink-0",
            )}
          >
            View all semesters
          </Link>
        </div>

        {availableSemesters.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {availableSemesters.map((semester) => (
              <WorkspaceCard
                key={semester.id}
                title={semester.name}
                entityLabel="Semester"
                mediaSrc="/images/default_center_banner.jpg"
                mediaAlt={`${semester.name} at ${center.name}`}
                href={semesterCardDestination(
                  projectId,
                  centerId,
                  semester,
                )}
                openLabel="Open semester"
                detail={
                  <div className="flex items-start gap-2">
                    <CalendarDays
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="tabular-nums">
                      {formatDate(semester.startDate)} –{" "}
                      {formatDate(semester.endDate)}
                    </span>
                  </div>
                }
                updatedAt={new Date(semester.updatedAt).toLocaleDateString(
                  "en-GB",
                )}
                editHref={
                  canManageCenter
                    ? `/projects/${projectId}/centers/${centerId}/semesters/${semester.id}/edit`
                    : undefined
                }
                editLabel={
                  canManageCenter ? `Edit ${semester.name}` : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center"
            aria-live="polite"
          >
            <CalendarDays
              className="mx-auto h-7 w-7 text-primary"
              aria-hidden="true"
            />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {canManageCenter
                ? draftCount > 0
                  ? "No active semesters yet"
                  : "Create this center's first semester"
                : "No semesters are available"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {canManageCenter
                ? draftCount > 0
                  ? "Continue the draft setup above, then activate it when every decision is ready."
                  : "Start a semester draft, then set up students and staff."
                : "Ask an administrator to create or assign a semester."}
            </p>
            {canManageCenter && draftCount === 0 && (
              <Link
                to={`/projects/${projectId}/centers/${centerId}/semesters/new`}
                className={cn(buttonVariants(), "mt-5 min-h-11 gap-2")}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create semester
              </Link>
            )}
          </div>
        )}
      </section>
    </WorkspacePage>
  );
}
