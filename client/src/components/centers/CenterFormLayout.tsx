import type { FormEvent } from "react";
import { MapPin, Save, Trash2 } from "lucide-react";

import { CustomButton } from "@/components/ui/button";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import DoodleBackground from "@/components/DoodleBackground";

interface CenterFormLayoutProps {
    mode: "create" | "edit";
    projectName: string;
    name: string;
    address: string;
    isPending: boolean;
    onNameChange: (value: string) => void;
    onAddressChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
    onDelete?: () => void;
    isDeletePending?: boolean;
}

export function CenterFormLayout({
    mode,
    projectName,
    name,
    address,
    isPending,
    onNameChange,
    onAddressChange,
    onSubmit,
    onCancel,
    onDelete,
    isDeletePending = false,
}: CenterFormLayoutProps) {
    const isEdit = mode === "edit";

    return (
        <div className="relative mx-auto w-full max-w-6xl py-2 sm:py-4">
            <DoodleBackground animated={false} numElements={6} />
            <div className="relative z-10">
                <header className="mb-7 border-b border-border pb-6">
                    <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
                        {isEdit ? "Edit center" : "Create center"}
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                        {isEdit
                            ? `${projectName} · Update the center name or address.`
                            : `${projectName} · Add a center, then create its semesters.`}
                    </p>
                </header>

                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="center-details-heading">
                            <div className="mb-6">
                                <h2 id="center-details-heading" className="text-lg font-semibold text-foreground">Center details</h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">Use the name people recognize and the complete location they need.</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="center-name" className="mb-2 block text-sm font-medium text-foreground">
                                        Center name <span className="text-destructive" aria-hidden="true">*</span>
                                    </label>
                                    <input
                                        id="center-name"
                                        type="text"
                                        value={name}
                                        onChange={(event) => onNameChange(event.target.value)}
                                        required
                                        autoComplete="organization"
                                        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="For example, Tulip"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="center-address" className="mb-2 block text-sm font-medium text-foreground">
                                        Address <span className="text-destructive" aria-hidden="true">*</span>
                                    </label>
                                    <textarea
                                        id="center-address"
                                        value={address}
                                        onChange={(event) => onAddressChange(event.target.value)}
                                        required
                                        rows={7}
                                        autoComplete="street-address"
                                        className="min-h-44 w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-base leading-7 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        placeholder="Enter the complete center address"
                                    />
                                    <p className="mt-2 text-xs leading-5 text-muted-foreground">This address appears on the Centers workspace.</p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby="parent-project-heading">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <MapPin className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 id="parent-project-heading" className="mt-4 text-lg font-semibold text-foreground">Parent project</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">This center belongs to the following project.</p>
                            <div className="mt-5 rounded-md border border-border bg-muted p-4">
                                <p className="text-xs font-medium uppercase text-muted-foreground">Project</p>
                                <p className="mt-1 font-semibold text-foreground">{projectName}</p>
                            </div>
                            <p className="mt-4 text-xs leading-5 text-muted-foreground">A center cannot be moved to another project from this form.</p>
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
                            loadingMessage={isEdit ? "Saving changes..." : "Creating center..."}
                            className="min-h-11 w-full gap-2 sm:w-auto"
                        >
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {isEdit ? "Save changes" : "Create center"}
                        </CustomButton>
                    </div>
                </form>

                {isEdit && onDelete && (
                    <section className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6" aria-labelledby="center-danger-heading">
                        <div>
                            <h2 id="center-danger-heading" className="text-base font-semibold text-foreground">Danger zone</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Deleting a center also removes its semesters when no protected enrollment history prevents deletion.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeletePending}
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto motion-reduce:transition-none"
                        >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete center
                        </button>
                    </section>
                )}
            </div>
        </div>
    );
}
