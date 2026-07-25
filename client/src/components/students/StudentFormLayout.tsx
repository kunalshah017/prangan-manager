import type { FormEvent } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
    GraduationCap,
    HeartHandshake,
    Phone,
    Save,
    Sparkles,
    UserRound,
} from "lucide-react";

import ImageUpload from "@/components/ui/image-upload";
import { SemesterLevelSelect } from "@/components/levels/SemesterLevelSelect";
import {
    PersonNameFields,
    type PersonNameField,
} from "@/components/ui/person-name-fields";
import { CustomButton } from "@/components/ui/button";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import type { CreateStudentRequest, SemesterLevel } from "@/types/api";

export type StudentFormValues = Omit<CreateStudentRequest, "enrollment">;
type StudentField = keyof StudentFormValues;

interface StudentFormLayoutProps {
    mode: "create" | "edit";
    values: StudentFormValues;
    semesterId?: string;
    semesterLevelId?: string;
    currentSemesterLevel?: SemesterLevel;
    errors: Record<string, string>;
    isPending: boolean;
    studentName?: string;
    error?: string;
    onChange: (field: StudentField, value: string) => void;
    onNameChange: (field: PersonNameField, value: string) => void;
    onSemesterLevelChange?: (semesterLevelId: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onCancel: () => void;
}

const familyIncomeOptions = [
    { value: "", label: "Select income range" },
    { value: "0-25000", label: "₹0 - ₹25,000" },
    { value: "25000-50000", label: "₹25,000 - ₹50,000" },
    { value: "50000-75000", label: "₹50,000 - ₹75,000" },
    { value: "75000-100000", label: "₹75,000 - ₹1,00,000" },
    { value: "100000+", label: "₹1,00,000+" },
];

const inputClass =
    "min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function StudentFormLayout({
    mode,
    values,
    semesterId = "",
    semesterLevelId,
    currentSemesterLevel,
    errors,
    isPending,
    studentName,
    error,
    onChange,
    onNameChange,
    onSemesterLevelChange,
    onSubmit,
    onCancel,
}: StudentFormLayoutProps) {
    const isEdit = mode === "edit";
    const title = isEdit ? "Edit student" : "Add student";
    const subtitle = isEdit
        ? `Update ${studentName || "this student"}'s identity, contact, family, and learning profile.`
        : "Create the student profile and assign the starting level for this semester.";

    return (
        <>
            <WorkspacePageHeader title={title} description={subtitle} />

            {error && (
                <div className="mb-5 mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                    {error}
                </div>
            )}

            <form onSubmit={onSubmit} className="mt-5 space-y-5">
                <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="student-photo-heading">
                    <div>
                        <h2 id="student-photo-heading" className="text-lg font-semibold text-foreground">Profile photo</h2>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">A clear face photo helps educators identify the student quickly.</p>
                    </div>
                    <div className="mt-5 max-w-sm">
                        <ImageUpload
                            label="Student photo"
                            value={values.profileImageUrl || ""}
                            onChange={(value) => onChange("profileImageUrl", value)}
                            onRemove={() => onChange("profileImageUrl", "")}
                            disabled={isPending}
                            variant="rounded"
                            placeholder="Upload student photo"
                        />
                    </div>
                </section>

                <div className="space-y-5">
                    <FormSection
                        id="student-identity-heading"
                        icon={UserRound}
                        title="Student identity"
                        description="Use the student's official name and core academic details."
                    >
                        <PersonNameFields
                            idPrefix={`${mode}-student`}
                            firstName={values.firstName}
                            middleName={values.middleName || ""}
                            lastName={values.lastName || ""}
                            onChange={onNameChange}
                            errors={{ firstName: errors.firstName }}
                            disabled={isPending}
                        />
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            {mode === "create" && onSemesterLevelChange && (
                                <div className="grid content-start gap-2">
                                    <SemesterLevelSelect
                                        id="student-level"
                                        semesterId={semesterId}
                                        value={semesterLevelId}
                                        onChange={onSemesterLevelChange}
                                        disabled={isPending}
                                        required
                                        includeInactiveCurrent
                                        currentLevel={currentSemesterLevel}
                                    />
                                    {errors.level && <p className="text-sm text-destructive" role="alert">{errors.level}</p>}
                                </div>
                            )}
                            <Field label="Date of birth" htmlFor="student-dob">
                                <input
                                    id="student-dob"
                                    type="date"
                                    value={values.dob || ""}
                                    onChange={(event) => onChange("dob", event.target.value)}
                                    disabled={isPending}
                                    className={inputClass}
                                />
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection
                        id="student-contact-heading"
                        icon={Phone}
                        title="Contact details"
                        description="Add the most reliable numbers for calls and WhatsApp communication."
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <PhoneField label="Phone number" id="student-phone" value={values.phoneNumber} error={errors.phoneNumber} disabled={isPending} onChange={(value) => onChange("phoneNumber", value)} />
                            <PhoneField label="WhatsApp number" id="student-whatsapp" value={values.whatsappNumber} error={errors.whatsappNumber} disabled={isPending} onChange={(value) => onChange("whatsappNumber", value)} />
                            <PhoneField label="Alternate number" id="student-alternate" value={values.alternateNumber} error={errors.alternateNumber} disabled={isPending} onChange={(value) => onChange("alternateNumber", value)} />
                            <Field label="Address" htmlFor="student-address" className="sm:row-span-2">
                                <textarea
                                    id="student-address"
                                    rows={5}
                                    value={values.address || ""}
                                    onChange={(event) => onChange("address", event.target.value)}
                                    disabled={isPending}
                                    autoComplete="street-address"
                                    className={cn(inputClass, "min-h-32 resize-y py-3")}
                                    placeholder="Complete residential address"
                                />
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection
                        id="student-family-heading"
                        icon={HeartHandshake}
                        title="Family and education"
                        description="Keep guardian, school, and household details together for easier follow-up."
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <TextField label="Father's name" id="student-father-name" value={values.fatherName} disabled={isPending} onChange={(value) => onChange("fatherName", value)} />
                            <TextField label="Mother's name" id="student-mother-name" value={values.motherName} disabled={isPending} onChange={(value) => onChange("motherName", value)} />
                            <TextField label="Father's occupation" id="student-father-occupation" value={values.fatherOccupation} disabled={isPending} onChange={(value) => onChange("fatherOccupation", value)} />
                            <TextField label="Mother's occupation" id="student-mother-occupation" value={values.motherOccupation} disabled={isPending} onChange={(value) => onChange("motherOccupation", value)} />
                            <TextField label="School" id="student-school" value={values.schoolName} disabled={isPending} onChange={(value) => onChange("schoolName", value)} />
                            <Field label="Family income range" htmlFor="student-income">
                                <select id="student-income" value={values.familyIncome || ""} onChange={(event) => onChange("familyIncome", event.target.value)} disabled={isPending} className={inputClass}>
                                    {familyIncomeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection
                        id="student-aspiration-heading"
                        icon={Sparkles}
                        title="Future aspiration"
                        description="Capture the profession or goal the student currently imagines for their future."
                    >
                        <TextField label="Future profession or career goal" id="student-future-profession" value={values.futureProfession} disabled={isPending} onChange={(value) => onChange("futureProfession", value)} placeholder="For example, doctor, engineer, teacher" />
                    </FormSection>
                </div>

                <div className="z-20 flex flex-col-reverse gap-3 rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-end lg:sticky lg:bottom-3">
                    <button type="button" onClick={onCancel} disabled={isPending} className={cn(buttonVariants({ variant: "outline" }), "min-h-11 w-full sm:w-auto")}>Cancel</button>
                    <CustomButton type="submit" isLoading={isPending} loadingMessage={isEdit ? "Saving student..." : "Creating student..."} className="min-h-11 w-full gap-2 sm:w-auto">
                        <Save className="h-4 w-4" aria-hidden="true" />
                        {isEdit ? "Save changes" : "Create student"}
                    </CustomButton>
                </div>
            </form>
        </>
    );
}

function FormSection({ id, icon: Icon, title, description, children }: { id: string; icon: typeof GraduationCap; title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby={id}>
            <div className="mb-6 flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <div><h2 id={id} className="text-lg font-semibold text-foreground">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>
            </div>
            {children}
        </section>
    );
}

function Field({ label, htmlFor, required, error, className, children }: { label: string; htmlFor: string; required?: boolean; error?: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={cn("grid content-start gap-2", className)}>
            <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}</label>
            {children}
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
    );
}

function TextField({ label, id, value, disabled, onChange, placeholder }: { label: string; id: string; value?: string; disabled: boolean; onChange: (value: string) => void; placeholder?: string }) {
    return <Field label={label} htmlFor={id}><input id={id} type="text" value={value || ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={inputClass} placeholder={placeholder} /></Field>;
}

function PhoneField({ label, id, value, error, disabled, onChange }: { label: string; id: string; value?: string; error?: string; disabled: boolean; onChange: (value: string) => void }) {
    return (
        <Field label={label} htmlFor={id} error={error}>
            <PhoneInput id={id} international defaultCountry="IN" value={value || ""} onChange={(phone) => onChange(phone || "")} disabled={disabled} className={cn("min-h-11 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", error && "border-destructive")} />
        </Field>
    );
}
