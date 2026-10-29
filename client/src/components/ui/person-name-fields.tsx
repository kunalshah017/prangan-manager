import { cn } from "@/lib/utils";

export type PersonNameField = "firstName" | "middleName" | "lastName";

interface PersonNameFieldsProps {
    firstName: string;
    middleName: string;
    lastName: string;
    onChange: (field: PersonNameField, value: string) => void;
    errors?: Partial<Record<PersonNameField, string>>;
    disabled?: boolean;
    idPrefix: string;
    className?: string;
    // Fields that must be filled; only the first name unless a form needs more.
    requiredFields?: readonly PersonNameField[];
}

const fields = [
    {
        name: "firstName",
        label: "First name",
        autoComplete: "given-name",
        placeholder: "First name",
    },
    {
        name: "middleName",
        label: "Middle name",
        autoComplete: "additional-name",
        placeholder: "Middle name",
    },
    {
        name: "lastName",
        label: "Last name",
        autoComplete: "family-name",
        placeholder: "Last name",
    },
] as const satisfies ReadonlyArray<{
    name: PersonNameField;
    label: string;
    autoComplete: string;
    placeholder: string;
}>;

export function PersonNameFields({
    firstName,
    middleName,
    lastName,
    onChange,
    errors = {},
    disabled = false,
    idPrefix,
    className,
    requiredFields = ["firstName"],
}: PersonNameFieldsProps) {
    const values = { firstName, middleName, lastName };

    return (
        <fieldset className={cn("grid gap-4 sm:grid-cols-3", className)}>
            <legend className="sr-only">Person name</legend>
            {fields.map((field) => {
                const inputId = `${idPrefix}-${field.name}`;
                const errorId = `${inputId}-error`;
                const error = errors[field.name];
                const required = requiredFields.includes(field.name);

                return (
                    <div key={field.name} className="grid content-start gap-2">
                        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
                            {field.label}
                            {required && (
                                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
                            )}
                        </label>
                        <input
                            id={inputId}
                            type="text"
                            autoComplete={field.autoComplete}
                            value={values[field.name]}
                            onChange={(event) => onChange(field.name, event.target.value)}
                            disabled={disabled}
                            required={required}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? errorId : undefined}
                            placeholder={field.placeholder}
                            className={cn(
                                "min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                error && "border-destructive focus-visible:ring-destructive",
                            )}
                        />
                        {error && (
                            <p id={errorId} className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        )}
                    </div>
                );
            })}
        </fieldset>
    );
}
