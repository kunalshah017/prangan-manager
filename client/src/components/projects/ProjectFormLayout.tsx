import type { FormEvent } from "react";

import ImageUpload from "@/components/ui/image-upload";
import { PageTitle } from "@/components/navigation/PageTitle";
import { Input, Textarea } from "@/components/ui/form-controls";
import { DangerZone, FormActions, FormField, FormSection } from "@/components/workspace/FormParts";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { cn } from "@/lib/utils";

type ProjectStatus = "ACTIVE" | "INACTIVE";

interface ProjectFormLayoutProps {
    mode: "create" | "edit";
    name: string;
    description: string;
    status?: ProjectStatus;
    imageUrl: string;
    isPending: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onStatusChange?: (value: ProjectStatus) => void;
    onImageChange: (value: string) => void;
    onImageRemove: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    onDelete?: () => void;
    isDeletePending?: boolean;
}

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string; hint: string }> = [
    { value: "ACTIVE", label: "Active", hint: "Open to its team" },
    { value: "INACTIVE", label: "Inactive", hint: "Kept in records only" },
];

export function ProjectFormLayout({
    mode,
    name,
    description,
    status,
    imageUrl,
    isPending,
    onNameChange,
    onDescriptionChange,
    onStatusChange,
    onImageChange,
    onImageRemove,
    onSubmit,
    onCancel,
    onDelete,
    isDeletePending = false,
}: ProjectFormLayoutProps) {
    const isEdit = mode === "edit";

    return (
        <WorkspacePage className="space-y-6" withMobileAction>
            <PageTitle title={isEdit ? "Edit project" : "New project"} />

            <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                    <FormSection id="project-details-heading" title="Project details">
                        <FormField htmlFor="project-name" label="Project name" required>
                            <Input
                                id="project-name"
                                value={name}
                                onChange={(event) => onNameChange(event.target.value)}
                                required
                                autoComplete="off"
                                placeholder="For example, Chanchalmann"
                            />
                        </FormField>
                        <FormField
                            htmlFor="project-description"
                            label="Description"
                            required
                            hint="Shown on the project page under its photo."
                        >
                            <Textarea
                                id="project-description"
                                value={description}
                                onChange={(event) => onDescriptionChange(event.target.value)}
                                required
                                rows={7}
                                aria-describedby="project-description-hint"
                                placeholder="What the project does and the communities it serves."
                            />
                        </FormField>
                    </FormSection>

                    <div className="space-y-5">
                        <FormSection
                            id="project-banner-heading"
                            title="Project banner"
                            description="A wide photo works best. It leads the project page."
                        >
                            <ImageUpload
                                label=""
                                value={imageUrl}
                                fallbackValue="/images/default_project_banner.jpg"
                                fallbackLabel="Default banner"
                                onChange={onImageChange}
                                onRemove={onImageRemove}
                                placeholder="Upload a project photo"
                            />
                        </FormSection>

                        {isEdit && status && onStatusChange && (
                            <FormSection id="project-setup-heading" title="Availability">
                                <fieldset>
                                    <legend className="sr-only">Project status</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        {STATUS_OPTIONS.map((option) => (
                                            <label
                                                key={option.value}
                                                className={cn(
                                                    "flex min-h-16 cursor-pointer flex-col justify-center rounded-lg border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none",
                                                    status === option.value
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                                                        : "border-border hover:bg-accent/50",
                                                )}
                                            >
                                                <input
                                                    type="radio"
                                                    name="project-status"
                                                    value={option.value}
                                                    checked={status === option.value}
                                                    onChange={() => onStatusChange(option.value)}
                                                    className="sr-only"
                                                />
                                                <span className="text-base font-semibold text-foreground">{option.label}</span>
                                                <span className="text-sm text-muted-foreground">{option.hint}</span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            </FormSection>
                        )}
                    </div>
                </div>

                <FormActions
                    submitLabel={isEdit ? "Save changes" : "Create project"}
                    pendingLabel={isEdit ? "Saving changes..." : "Creating project..."}
                    isPending={isPending}
                    onCancel={onCancel}
                />
            </form>

            {isEdit && onDelete && (
                <DangerZone
                    description="Delete this project only when its centres, semesters and enrolment history no longer need to be kept."
                    actionLabel="Delete project"
                    onAction={onDelete}
                    isPending={isDeletePending}
                />
            )}
        </WorkspacePage>
    );
}
