import type { FormEvent } from "react";

import { PageTitle } from "@/components/navigation/PageTitle";
import { Input } from "@/components/ui/form-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DangerZone, FormActions, FormField, FormSection } from "@/components/workspace/FormParts";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { buttonVariants } from "@/lib/button-variants";
import { sortByJourneyOrder } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { AcademicLevel, Semester } from "@/types/api";

// Radix Select reserves the empty string, so "no previous semester" gets its own value.
const NO_SOURCE = "none";

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
        <WorkspacePage className="max-w-3xl space-y-6 lg:mx-0" withMobileAction>
            <PageTitle title={isEdit ? "Edit semester" : "New semester"} />

            <form onSubmit={onSubmit} className="space-y-5">
                <FormSection
                    id="semester-details-heading"
                    title="Semester details"
                    description={`At ${centerName}. A semester can't be moved to another centre.`}
                >
                    <FormField htmlFor="semester-name" label="Semester name" required>
                        <Input
                            id="semester-name"
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            required
                            autoComplete="off"
                            placeholder="For example, Semester Year 2026-27"
                        />
                    </FormField>
                </FormSection>

                <FormSection id="semester-schedule-heading" title="Schedule" description="Both dates are included.">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField htmlFor="semester-start-date" label="Starts" required>
                            <Input
                                id="semester-start-date"
                                type="date"
                                value={startDate}
                                onChange={(event) => onStartDateChange(event.target.value)}
                                required
                            />
                        </FormField>
                        <FormField htmlFor="semester-end-date" label="Ends" required>
                            <Input
                                id="semester-end-date"
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={(event) => onEndDateChange(event.target.value)}
                                required
                            />
                        </FormField>
                    </div>
                </FormSection>

                {!isEdit && (
                    <FormSection
                        id="previous-semester-heading"
                        title="Start from a previous semester"
                        description="Copies its students, staff roles and rates into a draft you review. The earlier semester is not changed."
                    >
                        <FormField htmlFor="source-semester" label="Previous semester">
                            <Select
                                value={sourceSemesterId || NO_SOURCE}
                                onValueChange={(value) => onSourceSemesterIdChange?.(value === NO_SOURCE ? "" : value)}
                            >
                                <SelectTrigger id="source-semester"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_SOURCE}>Start without a previous semester</SelectItem>
                                    {[...sourceSemesters]
                                        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
                                        .map((semester) => (
                                            <SelectItem key={semester.id} value={semester.id}>
                                                {semester.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                    </FormSection>
                )}

                <FormSection
                    id="semester-levels-heading"
                    title="Levels"
                    description="The levels this centre runs this semester, from the level catalogue."
                >
                    {academicLevelsLoading ? (
                        <div className="grid gap-2 sm:grid-cols-2" aria-label="Loading academic levels" aria-busy="true">
                            {[0, 1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />)}
                        </div>
                    ) : academicLevelError ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
                            <p className="text-sm text-destructive">Levels could not be loaded.</p>
                            {onRetryAcademicLevels && <button type="button" onClick={onRetryAcademicLevels} className={cn(buttonVariants({ variant: "outline" }), "mt-3 min-h-11")}>Try again</button>}
                        </div>
                    ) : orderedAcademicLevels.length === 0 ? (
                        <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">No levels are available. Ask an administrator to add one to the level catalogue.</p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2" role="group" aria-labelledby="semester-levels-heading" aria-describedby={academicLevelIds.length === 0 ? "semester-levels-error" : undefined}>
                            {orderedAcademicLevels.map((level) => (
                                <label key={level.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 text-base text-foreground transition-colors hover:bg-accent/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none">
                                    <input type="checkbox" checked={academicLevelIds.includes(level.id)} onChange={() => toggleAcademicLevel(level.id)} className="h-5 w-5 shrink-0 accent-primary" />
                                    <span className="min-w-0 flex-1 font-medium">{level.name}</span>
                                    {!level.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>}
                                </label>
                            ))}
                        </div>
                    )}
                    {!academicLevelsLoading && !academicLevelError && academicLevelIds.length === 0 && (
                        <p id="semester-levels-error" className="text-sm text-destructive" role="alert">Select at least one level.</p>
                    )}
                </FormSection>

                <FormActions
                    submitLabel={isEdit ? "Save changes" : "Create semester"}
                    pendingLabel={isEdit ? "Saving changes..." : "Creating semester..."}
                    isPending={isPending}
                    onCancel={onCancel}
                    submitDisabled={academicLevelsLoading || academicLevelError || academicLevelIds.length === 0}
                />
            </form>

            {isEdit && onDelete && (
                <DangerZone
                    description="Delete this semester only when its enrolment and academic history no longer need to be kept."
                    actionLabel="Delete semester"
                    onAction={onDelete}
                    isPending={isDeletePending}
                />
            )}
        </WorkspacePage>
    );
}
