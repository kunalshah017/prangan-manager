import type { FormEvent } from "react";
import { ImageIcon, Save, Trash2 } from "lucide-react";

import ImageUpload from "@/components/ui/image-upload";
import { CustomButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import DoodleBackground from "@/components/DoodleBackground";

interface ProjectFormLayoutProps {
    mode: "create" | "edit";
    name: string;
    description: string;
    status?: "ACTIVE" | "INACTIVE";
    imageUrl: string;
    isPending: boolean;
    onNameChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onStatusChange?: (value: "ACTIVE" | "INACTIVE") => void;
    onImageChange: (value: string) => void;
    onImageRemove: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    onDelete?: () => void;
    isDeletePending?: boolean;
}

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
    const title = isEdit ? "Edit project" : "Create project";
    const subtitle = isEdit
        ? "Update how this project appears and whether it is available to its workspace."
        : "Set up the project workspace. Centers and semesters can be added after creation.";

    return (
        <div className="relative mx-auto w-full max-w-6xl py-2 sm:py-4">
            <DoodleBackground animated={false} numElements={6} />

            <div className="relative z-10">
                <header className="mb-7 border-b border-border pb-6">
                    <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{subtitle}</p>
                </header>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="project-details-heading">
                            <div className="mb-6">
                                <h2 id="project-details-heading" className="text-lg font-semibold text-foreground">Project details</h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">Use a recognizable name and a concise description for workspace members.</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-foreground">
                                        Project name <span className="text-destructive" aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="project-name"
                                        type="text"
                                        value={name}
                                        onChange={(event) => onNameChange(event.target.value)}
                                        required
                                        autoComplete="off"
                                        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="For example, Chanchalmann"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="project-description" className="mb-2 block text-sm font-medium text-foreground">
                                        Description <span className="text-destructive" aria-hidden="true">*</span>
                                    </label>
                                    <textarea
                                        id="project-description"
                                        value={description}
                                        onChange={(event) => onDescriptionChange(event.target.value)}
                                        required
                                        rows={9}
                                        className="min-h-56 w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-base leading-7 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="Describe the project’s purpose and the communities it serves."
                                    />
                                    <p className="mt-2 text-xs leading-5 text-muted-foreground">This description appears on the Projects workspace.</p>
                                </div>
                            </div>
                        </section>

                        <div className="space-y-5">
                            <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="project-setup-heading">
                                <h2 id="project-setup-heading" className="text-lg font-semibold text-foreground">Project setup</h2>
                                <div className="mt-5 space-y-5">
                                    {isEdit && status && onStatusChange && (
                                        <div>
                                            <label htmlFor="project-status" className="mb-2 block text-sm font-medium text-foreground">Status</label>
                                            <select
                                                id="project-status"
                                                value={status}
                                                onChange={(event) => onStatusChange(event.target.value as "ACTIVE" | "INACTIVE")}
                                                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            >
                                                <option value="ACTIVE">Active</option>
                                                <option value="INACTIVE">Inactive</option>
                                            </select>
                                            <p className="mt-2 text-xs leading-5 text-muted-foreground">Inactive projects remain in records but are marked unavailable.</p>
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-sm font-medium text-foreground">Project type</p>
                                        <div className="mt-2 flex min-h-11 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                                            Educational Project
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-muted-foreground">Project type is fixed for this workspace.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="project-banner-heading">
                                <div className="mb-4 flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <ImageIcon className="h-4 w-4" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <h2 id="project-banner-heading" className="text-lg font-semibold text-foreground">Project banner</h2>
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Use a wide image that represents the project.</p>
                                    </div>
                                </div>
                                <ImageUpload
                                    label=""
                                    value={imageUrl}
                                    fallbackValue="/images/default_project_banner.jpg"
                                    fallbackLabel="Default banner"
                                    onChange={onImageChange}
                                    onRemove={onImageRemove}
                                    placeholder="Upload a custom project banner"
                                />
                            </section>
                        </div>
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
                            loadingMessage={isEdit ? "Saving changes..." : "Creating project..."}
                            className="min-h-11 w-full gap-2 sm:w-auto"
                        >
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {isEdit ? "Save changes" : "Create project"}
                        </CustomButton>
                    </div>
                </form>

                {isEdit && onDelete && (
                    <section className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6" aria-labelledby="danger-zone-heading">
                        <div>
                            <h2 id="danger-zone-heading" className="text-base font-semibold text-foreground">Danger zone</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Delete this project only when its centers, semesters, and enrollment history no longer need to be retained.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeletePending}
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto motion-reduce:transition-none"
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete project
                        </button>
                    </section>
                )}
            </div>
        </div>
    );
}
