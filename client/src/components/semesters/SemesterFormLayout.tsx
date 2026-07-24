import type { FormEvent } from "react";
import { CalendarDays, Save, Trash2 } from "lucide-react";

import DoodleBackground from "@/components/DoodleBackground";
import { CustomButton } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import { sortByJourneyOrder } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { AcademicLevel, Semester } from "@/types/api";

interface SemesterFormLayoutProps {
    mode: "create" | "edit";
    centerName: string;
    name: string;
    startDate: string;
    endDate: string;
    academicLevels: AcademicLevel[];
    academicLevelIds: string[];
    sourceSemesters?: Semester[];
    sourceSemesterId?: string;
    academicLevelsLoading?: boolean;
    academicLevelError?: boolean;
    isPending: boolean;
    onNameChange: (value: string) => void;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onAcademicLevelIdsChange: (value: string[]) => void;
    onSourceSemesterIdChange?: (value: string) => void;
    onRetryAcademicLevels?: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    onDelete?: () => void;
    isDeletePending?: boolean;
}

export function SemesterFormLayout({
    mode,
    centerName,
    name,
    startDate,
    endDate,
    academicLevels,
    academicLevelIds,
    sourceSemesters = [],
    sourceSemesterId = "",
    academicLevelsLoading = false,
    academicLevelError = false,
    isPending,
    onNameChange,
    onStartDateChange,
    onEndDateChange,
    onAcademicLevelIdsChange,
    onSourceSemesterIdChange,
    onRetryAcademicLevels,
    onSubmit,
    onCancel,
    onDelete,
    isDeletePending = false,
}: SemesterFormLayoutProps) {
    const isEdit = mode === "edit";
    const orderedAcademicLevels = sortByJourneyOrder(academicLevels);
    const toggleAcademicLevel = (levelId: string) => {
        onAcademicLevelIdsChange(
            academicLevelIds.includes(levelId)
                ? academicLevelIds.filter((id) => id !== levelId)
                : [...academicLevelIds, levelId],
        );
    };

    return (
        <div className="relative mx-auto w-full max-w-6xl py-2 sm:py-4">
            <DoodleBackground animated={false} numElements={6} />
            <div className="relative z-10">
                <header className="mb-7 border-b border-border pb-6">
                    <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
                        {isEdit ? "Edit semester" : "Create semester"}
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                        {isEdit
                            ? `${centerName} · Update the semester name or schedule.`
                            : `${centerName} · Add a semester, then open its academic dashboard.`}
                    </p>
                </header>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="semester-details-heading">
                            <div className="mb-6">
                                <h2 id="semester-details-heading" className="text-lg font-semibold text-foreground">Semester details</h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">Use a name that clearly identifies the academic cycle.</p>
                            </div>

                            <div>
                                <label htmlFor="semester-name" className="mb-2 block text-sm font-medium text-foreground">
                                    Semester name <span className="text-destructive" aria-hidden="true">*</span>
                                </label>
                                <input
                                    id="semester-name"
                                    type="text"
                                    value={name}
                                    onChange={(event) => onNameChange(event.target.value)}
                                    required
                                    autoComplete="off"
                                    className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    placeholder="For example, Semester Year 2026-27"
                                />
                            </div>

                            <section className="mt-7 border-t border-border pt-6" aria-labelledby="semester-schedule-heading">
                                <h2 id="semester-schedule-heading" className="text-lg font-semibold text-foreground">Schedule</h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">Set the inclusive start and end dates for this semester.</p>
                                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="semester-start-date" className="mb-2 block text-sm font-medium text-foreground">
                                            Start date <span className="text-destructive" aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="semester-start-date"
                                            type="date"
                                            value={startDate}
                                            onChange={(event) => onStartDateChange(event.target.value)}
                                            required
                                            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="semester-end-date" className="mb-2 block text-sm font-medium text-foreground">
                                            End date <span className="text-destructive" aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="semester-end-date"
                                            type="date"
                                            value={endDate}
                                            min={startDate}
                                            onChange={(event) => onEndDateChange(event.target.value)}
                                            required
                                            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        />
                                    </div>
                                </div>
                            </section>

                            {!isEdit && (
                                <section className="mt-7 border-t border-border pt-6" aria-labelledby="previous-semester-heading">
                                    <h2 id="previous-semester-heading" className="text-lg font-semibold text-foreground">Prepare from a previous semester</h2>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Copy the previous student roster, staff roles, and rates into a reviewable draft. Older records will not be changed.
                                    </p>
                                    <label htmlFor="source-semester" className="mb-2 mt-5 block text-sm font-medium text-foreground">Previous semester</label>
                                    <select
                                        id="source-semester"
                                        value={sourceSemesterId}
                                        onChange={(event) => onSourceSemesterIdChange?.(event.target.value)}
                                        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        <option value="">Start without a previous semester</option>
                                        {[...sourceSemesters]
                                            .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
                                            .map((semester) => (
                                                <option key={semester.id} value={semester.id}>
                                                    {semester.name}
                                                </option>
                                            ))}
                                    </select>
                                </section>
                            )}

                            <section className="mt-7 border-t border-border pt-6" aria-labelledby="semester-levels-heading">
                                <h2 id="semester-levels-heading" className="text-lg font-semibold text-foreground">Academic levels</h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose at least one level offered during this semester.</p>
                                {academicLevelsLoading ? (
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Loading academic levels" aria-busy="true">
                                        {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />)}
                                    </div>
                                ) : academicLevelError ? (
                                    <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-4" role="alert">
                                        <p className="text-sm text-destructive">Academic levels could not be loaded.</p>
                                        {onRetryAcademicLevels && <button type="button" onClick={onRetryAcademicLevels} className={cn(buttonVariants({ variant: "outline" }), "mt-3 min-h-11")}>Try again</button>}
                                    </div>
                                ) : orderedAcademicLevels.length === 0 ? (
                                    <p className="mt-5 rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">No active academic levels are available. Ask an administrator to create or restore one.</p>
                                ) : (
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-labelledby="semester-levels-heading" aria-describedby={academicLevelIds.length === 0 ? "semester-levels-error" : undefined}>
                                        {orderedAcademicLevels.map((level) => (
                                            <label key={level.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-4 py-3 text-sm text-foreground transition-colors hover:bg-accent/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none">
                                                <input type="checkbox" checked={academicLevelIds.includes(level.id)} onChange={() => toggleAcademicLevel(level.id)} className="h-5 w-5 shrink-0 accent-primary" />
                                                <span className="min-w-0 flex-1 font-medium">{level.name}</span>
                                                {!level.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>}
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {!academicLevelsLoading && !academicLevelError && academicLevelIds.length === 0 && (
                                    <p id="semester-levels-error" className="mt-3 text-sm text-destructive" role="alert">Select at least one academic level.</p>
                                )}
                            </section>
                        </section>

                        <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="parent-center-heading">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <CalendarDays className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 id="parent-center-heading" className="mt-4 text-lg font-semibold text-foreground">Parent center</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">This semester belongs to the following center.</p>
                            <div className="mt-5 rounded-md border border-border bg-muted p-4">
                                <p className="text-xs font-medium uppercase text-muted-foreground">Center</p>
                                <p className="mt-1 font-semibold text-foreground">{centerName}</p>
                            </div>
                            <p className="mt-4 text-xs leading-5 text-muted-foreground">A semester cannot be moved to another center from this form.</p>
                        </section>
                    </div>

                    <div className="z-20 flex flex-col-reverse gap-3 rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end lg:sticky lg:bottom-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-auto")}
                        >
                            Cancel
                        </button>
                        <CustomButton
                            type="submit"
                            isLoading={isPending}
                            disabled={academicLevelsLoading || academicLevelError || academicLevelIds.length === 0}
                            loadingMessage={isEdit ? "Saving changes..." : "Creating semester..."}
                            className="min-h-11 w-full gap-2 sm:w-auto"
                        >
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {isEdit ? "Save changes" : "Create semester"}
                        </CustomButton>
                    </div>
                </form>

                {isEdit && onDelete && (
                    <section className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6" aria-labelledby="semester-danger-heading">
                        <div>
                            <h2 id="semester-danger-heading" className="text-base font-semibold text-foreground">Danger zone</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Delete this semester only when its enrollment and academic history no longer need to be retained.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeletePending}
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto motion-reduce:transition-none"
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete semester
                        </button>
                    </section>
                )}
            </div>
        </div>
    );
}
