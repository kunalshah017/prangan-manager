import type { FormEvent } from "react";

import { PageTitle } from "@/components/navigation/PageTitle";
import { Input, Textarea } from "@/components/ui/form-controls";
import ImageUpload from "@/components/ui/image-upload";
import { DangerZone, FormActions, FormField, FormSection } from "@/components/workspace/FormParts";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";

interface CenterFormLayoutProps {
    mode: "create" | "edit";
    projectName: string;
    name: string;
    address: string;
    imageUrl: string;
    isPending: boolean;
    onNameChange: (value: string) => void;
    onAddressChange: (value: string) => void;
    onImageChange: (url: string) => void;
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
    imageUrl,
    isPending,
    onNameChange,
    onAddressChange,
    onImageChange,
    onSubmit,
    onCancel,
    onDelete,
    isDeletePending = false,
}: CenterFormLayoutProps) {
    const isEdit = mode === "edit";

    return (
        <WorkspacePage className="max-w-3xl space-y-6 lg:mx-0" withMobileAction>
            <PageTitle title={isEdit ? "Edit centre" : "New centre"} />

            <form onSubmit={onSubmit} className="space-y-5">
                <FormSection
                    id="center-details-heading"
                    title="Centre details"
                    description={`In ${projectName}. A centre can't be moved to another project.`}
                >
                    <FormField htmlFor="center-name" label="Centre name" required>
                        <Input
                            id="center-name"
                            value={name}
                            onChange={(event) => onNameChange(event.target.value)}
                            required
                            autoComplete="organization"
                            placeholder="For example, Tulip"
                        />
                    </FormField>
                    <FormField
                        htmlFor="center-address"
                        label="Address"
                        required
                        hint="Shown under the centre's name."
                    >
                        <Textarea
                            id="center-address"
                            value={address}
                            onChange={(event) => onAddressChange(event.target.value)}
                            required
                            rows={4}
                            autoComplete="street-address"
                            aria-describedby="center-address-hint"
                            placeholder="Street, area and city"
                        />
                    </FormField>
                </FormSection>

                <FormSection
                    id="center-banner-heading"
                    title="Centre banner"
                    description="A wide photo of the centre works best. It leads the centre page."
                >
                    <ImageUpload
                        label=""
                        value={imageUrl}
                        fallbackValue="/images/default_center_banner.jpg"
                        fallbackLabel="Default banner"
                        onChange={onImageChange}
                        onRemove={() => onImageChange("")}
                        placeholder="Upload a centre photo"
                    />
                </FormSection>

                <FormActions
                    submitLabel={isEdit ? "Save changes" : "Create centre"}
                    pendingLabel={isEdit ? "Saving changes..." : "Creating centre..."}
                    isPending={isPending}
                    onCancel={onCancel}
                />
            </form>

            {isEdit && onDelete && (
                <DangerZone
                    description="Deleting a centre also removes its semesters, unless protected enrolment history prevents it."
                    actionLabel="Delete centre"
                    onAction={onDelete}
                    isPending={isDeletePending}
                />
            )}
        </WorkspacePage>
    );
}
