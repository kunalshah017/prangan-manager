import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { PageTitle } from "@/components/navigation/PageTitle";
import { EntityList, EntityRow } from "@/components/workspace/EntityList";
import { ExpandableText } from "@/components/workspace/ExpandableText";
import { EmptyState, ErrorState, ListPageSkeleton } from "@/components/workspace/PageState";
import { PrimaryAction } from "@/components/workspace/PrimaryAction";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
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
import { semesterProgress, semesterTiming } from "@/lib/workspace-display";
import {
  orderWorkspaceSemesters,
  semesterCardDestination,
} from "@/lib/workspace-hierarchy";
import type { Semester } from "@/types/api";

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
      <div className="flex items-center justify-between gap-3 text-sm">
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

function CurrentSemesterCard({
  semester,
  href,
}: {
  semester: Semester;
  href: string;
}) {
  const { week, totalWeeks, daysLeft, percentage } = semesterProgress(semester);

  return (
    <section
      aria-labelledby="current-semester"
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">Current semester</p>
          <h2
            id="current-semester"
            className="mt-0.5 truncate text-lg font-semibold text-foreground"
          >
            {semester.name}
          </h2>
        </div>
        <StatusBadge tone="running" label="Running" />
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium tabular-nums text-foreground">
            Week {week} of {totalWeeks}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {daysLeft === 0
              ? "Last day"
              : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${percentage}% of ${semester.name} has passed`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {formatDate(semester.startDate)} – {formatDate(semester.endDate)}
        </p>
      </div>

      <Link
        to={href}
        className={cn(buttonVariants(), "mt-4 min-h-11 w-full gap-1.5 sm:w-auto")}
      >
        Open semester
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
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

  if (centerQuery.isLoading || semestersQuery.isLoading) {
    return (
      <WorkspacePage>
        <ListPageSkeleton label="Loading centre" hero />
      </WorkspacePage>
    );
  }

  if (error || !centerQuery.data) {
    return (
      <WorkspacePage>
        <ErrorState
          title="Centre could not be loaded"
          description="Check your connection and try loading this centre again."
          onRetry={() => void Promise.all([centerQuery.refetch(), semestersQuery.refetch()])}
          backHref={`/projects/${projectId}/dashboard`}
          backLabel="Back to project"
        />
      </WorkspacePage>
    );
  }

  const center = centerQuery.data;
  const semesters = orderWorkspaceSemesters(semestersQuery.data || []);
  const setupSummaries = setupSummariesQuery.data || [];
  const draftSummaries = canManageCenter
    ? mergeDraftSetupSummaries(semesters, setupSummaries)
    : [];
  const availableSemesters = semesters.filter(
    (semester) => semester.status !== "DRAFT",
  );
  const currentSemester = availableSemesters.find(
    (semester) => semesterTiming(semester).tone === "running",
  );
  const otherSemesters = availableSemesters.filter(
    (semester) => semester !== currentSemester,
  );
  const newSemesterHref = `/projects/${projectId}/centers/${centerId}/semesters/new`;

  return (
    <WorkspacePage
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8"
      withMobileAction={canManageCenter}
    >
      <div className="min-w-0 space-y-6">
        <header>
          <PageTitle title={center.name} />
          <div className="-mx-4 -mt-[3.75rem] aspect-[2/1] overflow-hidden bg-muted sm:mx-0 sm:mt-0 sm:aspect-[5/2] sm:rounded-xl lg:aspect-[21/9]">
            <img
              src={center.imageUrl || "/images/default_center_banner.jpg"}
              alt={`${center.name} centre`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0 pt-2 text-[0.9375rem] leading-6 text-muted-foreground">
              <ExpandableText
                text={center.address || "Address not added"}
                collapseAfter={70}
                leadingIcon={<MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />}
              />
            </div>
            {canManageCenter && (
              <Link
                to={`/projects/${projectId}/centers/${centerId}/edit`}
                className={cn(buttonVariants({ variant: "outline" }), "min-h-11 shrink-0 gap-2")}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
            )}
          </div>
        </header>

        {currentSemester && (
          <CurrentSemesterCard
            semester={currentSemester}
            href={semesterCardDestination(projectId, centerId, currentSemester)}
          />
        )}

        {draftSummaries.length > 0 && (
          <section
            aria-labelledby="resume-semester-setup"
            className="rounded-xl border border-warning/50 bg-warning/10 p-4 sm:p-5"
          >
            <h2 id="resume-semester-setup" className="text-lg font-semibold text-foreground">
              Resume semester setup
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Finish student, staff and rate decisions, then activate the semester.
            </p>

            {setupSummariesQuery.isLoading ? (
              <div className="mt-4 h-32 animate-pulse rounded-lg bg-card motion-reduce:animate-none" aria-busy="true">
                <span className="sr-only">Loading semester setup progress</span>
              </div>
            ) : setupSummariesQuery.isError ? (
              <div className="mt-4 flex flex-col gap-3 rounded-lg bg-card p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <p className="text-sm text-foreground">Setup progress could not be loaded. Your drafts are unchanged.</p>
                <button
                  type="button"
                  onClick={() => void setupSummariesQuery.refetch()}
                  className={cn(buttonVariants({ variant: "outline" }), "min-h-11 shrink-0 gap-2")}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Try again
                </button>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {draftSummaries.map((summary) => (
                  <article key={summary.semester.id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-foreground">{summary.semester.name}</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {summary.sourceSemester
                            ? `Continuing from ${summary.sourceSemester.name}`
                            : "Starting without a previous semester"}
                        </p>
                      </div>
                      <StatusBadge tone="draft" label="Draft" />
                    </div>

                    {summary.progressAvailable ? (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <SetupProgress label="Students" {...summary.progress.students} />
                        <SetupProgress label="Staff" {...summary.progress.staff} />
                        <SetupProgress label="Rates" {...summary.progress.rates} />
                      </div>
                    ) : (
                      <p role="status" className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Progress unavailable. Continue setup to review the draft.
                      </p>
                    )}
                    <Link
                      to={semesterCardDestination(projectId, centerId, summary.semester)}
                      className={cn(buttonVariants(), "mt-4 min-h-11 w-full gap-1.5")}
                    >
                      Continue setup
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <section aria-labelledby="center-semesters" className="space-y-3 lg:sticky lg:top-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="center-semesters" className="text-lg font-semibold text-foreground">
            {currentSemester ? "Other semesters" : "Semesters"}{" "}
            <span className="font-normal tabular-nums text-muted-foreground">{otherSemesters.length}</span>
          </h2>
          {canManageCenter && (
            <PrimaryAction to={newSemesterHref} icon={<Plus className="h-5 w-5" aria-hidden="true" />}>
              New semester
            </PrimaryAction>
          )}
        </div>

        {otherSemesters.length > 0 ? (
          <EntityList label="Semesters">
            {otherSemesters.map((semester) => (
              <EntityRow
                key={semester.id}
                href={semesterCardDestination(projectId, centerId, semester)}
                title={semester.name}
                leading={
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  </span>
                }
                status={<StatusBadge {...semesterTiming(semester)} />}
                meta={
                  <span className="tabular-nums">
                    {formatDate(semester.startDate)} – {formatDate(semester.endDate)}
                  </span>
                }
              />
            ))}
          </EntityList>
        ) : currentSemester ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No past or upcoming semesters yet.
          </p>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={
              canManageCenter
                ? draftSummaries.length > 0
                  ? "No active semesters yet"
                  : "Create this centre's first semester"
                : "No semesters are available"
            }
            description={
              canManageCenter
                ? draftSummaries.length > 0
                  ? "Finish the draft setup above, then activate it."
                  : "Start a semester draft, then set up students and staff."
                : "Ask an administrator to create or assign a semester."
            }
          />
        )}
      </section>
    </WorkspacePage>
  );
}
