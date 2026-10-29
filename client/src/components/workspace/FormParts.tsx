import type { ReactNode } from "react";
import { Save, Trash2 } from "lucide-react";

import { CustomButton } from "@/components/ui/button";
import { Label } from "@/components/ui/form-controls";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ id, title, description, children }: FormSectionProps) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 id={id} className="text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

interface FormFieldProps {
  htmlFor: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FormField({ htmlFor, label, required = false, hint, children }: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-2">
        {label}
        {required && <span className="ml-1 font-normal text-muted-foreground">(required)</span>}
      </Label>
      {children}
      {hint && <p id={hintId} className="mt-2 text-sm leading-5 text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface FormActionsProps {
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onCancel: () => void;
  submitDisabled?: boolean;
}

// A bottom bar on phones keeps Save within thumb reach while scrolling a long
// form; on large screens it sits under the form and sticks while it scrolls.
export function FormActions({ submitLabel, pendingLabel, isPending, onCancel, submitDisabled = false }: FormActionsProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:sticky lg:bottom-3 lg:rounded-xl lg:border lg:bg-background/95 lg:p-3 lg:shadow-lg lg:backdrop-blur">
      <button
        type="button"
        onClick={onCancel}
        className={cn(buttonVariants({ variant: "ghost" }), "min-h-12 px-5 text-base")}
      >
        Cancel
      </button>
      <CustomButton
        type="submit"
        isLoading={isPending}
        disabled={submitDisabled}
        loadingMessage={pendingLabel}
        className="min-h-12 flex-1 gap-2 text-base sm:flex-none"
      >
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        {submitLabel}
      </CustomButton>
    </div>
  );
}

interface DangerZoneProps {
  description: string;
  actionLabel: string;
  onAction: () => void;
  isPending?: boolean;
}

export function DangerZone({ description, actionLabel, onAction, isPending = false }: DangerZoneProps) {
  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="rounded-xl border border-destructive/30 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5"
    >
      <div>
        <h2 id="danger-zone-heading" className="text-base font-semibold text-foreground">Danger zone</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={isPending}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 text-base font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:w-auto motion-reduce:transition-none"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {actionLabel}
      </button>
    </section>
  );
}
