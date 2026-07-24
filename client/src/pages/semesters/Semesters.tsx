import { ArrowLeft, CalendarDays, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import DoodleBackground from "@/components/DoodleBackground";
import { WorkspaceCard } from "@/components/workspace/WorkspaceCard";
import { useAuth } from "@/hooks/useAuth";
import { useCenter } from "@/hooks/useCenterQueries";
import { useSemestersByCenter } from "@/hooks/useSemesterQueries";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import {
    orderWorkspaceSemesters,
    semesterCardDestination,
} from "@/lib/workspace-hierarchy";

const formatSemesterDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", { timeZone: "UTC" });

const Semesters = () => {
    const { projectId, centerId } = useParams<{
        projectId: string;
        centerId: string;
    }>();
    const { isAdmin } = useAuth();
    const canManageSemesters = isAdmin();
    const {
        data: semesters,
        isLoading,
        error,
        refetch,
    } = useSemestersByCenter(centerId || "");
    const {
        data: center,
        isLoading: centerLoading,
        error: centerError,
        refetch: refetchCenter,
    } = useCenter(centerId || "");

    if (isLoading || centerLoading) {
        return (
            <div className="relative w-full" aria-live="polite" aria-busy="true">
                <DoodleBackground animated={false} numElements={6} />
                <div className="relative z-10 mx-auto w-full max-w-6xl animate-pulse py-2 motion-reduce:animate-none">
                    <div className="mb-8 space-y-3 border-b border-border pb-7">
                        <div className="h-9 w-64 rounded-md bg-muted" />
                        <div className="h-5 w-96 max-w-full rounded bg-muted" />
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                        {[0, 1].map((item) => (
                            <div key={item} className="h-56 rounded-lg border border-border bg-card" />
                        ))}
                    </div>
                </div>
                <span className="sr-only">Loading semesters</span>
            </div>
        );
    }

    if (error || centerError || !center) {
        return (
            <div className="relative mx-auto flex min-h-[55dvh] w-full max-w-2xl items-center justify-center px-4" aria-live="polite">
                <DoodleBackground animated={false} numElements={6} />
                <div className="relative z-10 w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm sm:p-8">
                    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <RefreshCw className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">Semesters could not be loaded</h1>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                        Check your connection and try again. Your semester access has not changed.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            to={`/projects/${projectId}/centers`}
                            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2")}
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to centers
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                void refetch();
                                void refetchCenter();
                            }}
                            className={cn(buttonVariants(), "min-h-11 gap-2")}
                        >
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const semesterList = orderWorkspaceSemesters(semesters || []).filter(
        (semester) => canManageSemesters || semester.status !== "DRAFT",
    );

    return (
        <div className="relative w-full">
            <DoodleBackground animated={false} numElements={6} />
            <section className="relative z-10 mx-auto w-full max-w-6xl py-2 sm:py-4">
                <header className="mb-7 flex flex-col gap-5 border-b border-border pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Semesters</h1>
                        <p className="mt-3 text-base leading-7 text-muted-foreground">
                            {center.name} · Choose a semester to open its dashboard and academic work.
                        </p>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                        <Link
                            to={`/projects/${projectId}/centers/${centerId}/dashboard`}
                            aria-label="Back to center dashboard"
                            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 flex-1 gap-2 sm:flex-none")}
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            <span className="sm:hidden">Dashboard</span>
                            <span className="hidden sm:inline">Back to center dashboard</span>
                        </Link>
                        {canManageSemesters && (
                            <Link
                                to={`/projects/${projectId}/centers/${centerId}/semesters/new`}
                                className={cn(buttonVariants(), "min-h-11 flex-1 gap-2 sm:flex-none")}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                New semester
                            </Link>
                        )}
                    </div>
                </header>

                {semesterList.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {semesterList.map((semester) => (
                            <WorkspaceCard
                                key={semester.id}
                                title={semester.name}
                                entityLabel={semester.status === "DRAFT" ? "Draft semester" : "Semester"}
                                mediaSrc="/images/default_center_banner.jpg"
                                mediaAlt={`${semester.name} at ${center.name}`}
                                href={semesterCardDestination(projectId || "", centerId || "", semester)}
                                openLabel={semester.status === "DRAFT" ? "Continue setup" : "Open dashboard"}
                                detail={
                                    <div className="flex items-start gap-2">
                                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                        <span className="tabular-nums">
                                            {formatSemesterDate(semester.startDate)} - {formatSemesterDate(semester.endDate)}
                                        </span>
                                    </div>
                                }
                                updatedAt={new Date(semester.updatedAt).toLocaleDateString("en-GB")}
                                editHref={canManageSemesters ? `/projects/${projectId}/centers/${centerId}/semesters/${semester.id}/edit` : undefined}
                                editLabel={canManageSemesters ? `Edit ${semester.name}` : undefined}
                            />
                        ))}
                    </div>
                )}

                {semesterList.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center" aria-live="polite">
                        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            {canManageSemesters ? <CalendarDays className="h-6 w-6" aria-hidden="true" /> : <ShieldCheck className="h-6 w-6" aria-hidden="true" />}
                        </div>
                        <h2 className="text-xl font-semibold text-foreground">
                            {canManageSemesters ? "Create the first semester" : "No semester access yet"}
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                            {canManageSemesters
                                ? `Add the first semester for ${center.name}, then open its dashboard.`
                                : "Ask an administrator to assign you to a semester in this center."}
                        </p>
                        {canManageSemesters && (
                            <Link
                                to={`/projects/${projectId}/centers/${centerId}/semesters/new`}
                                className={cn(buttonVariants(), "mt-6 min-h-11 gap-2")}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Create semester
                            </Link>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Semesters;
