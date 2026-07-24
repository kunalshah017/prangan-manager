export interface LsrwMarks {
  listeningMaxMarks: number;
  speakingMaxMarks: number;
  readingMaxMarks: number;
  writingMaxMarks: number;
}

export type LsrwMarksField = keyof LsrwMarks;

interface LsrwMarksFieldsProps {
  value: LsrwMarks;
  onChange: (field: LsrwMarksField, value: number) => void;
  disabled?: boolean;
  idPrefix?: string;
}

const fields = [
  { name: "listeningMaxMarks", label: "Listening" },
  { name: "speakingMaxMarks", label: "Speaking" },
  { name: "readingMaxMarks", label: "Reading" },
  { name: "writingMaxMarks", label: "Writing" },
] as const satisfies ReadonlyArray<{
  name: LsrwMarksField;
  label: string;
}>;

export function LsrwMarksFields({
  value,
  onChange,
  disabled = false,
  idPrefix = "exam",
}: LsrwMarksFieldsProps) {
  const total = fields.reduce((sum, field) => sum + value[field.name], 0);

  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-semibold text-foreground">
        LSRW maximum marks
      </legend>
      <p className="text-sm leading-6 text-muted-foreground">
        Set the maximum marks available for each language skill.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const inputId = `${idPrefix}-${field.name}`;

          return (
            <div key={field.name} className="grid gap-2">
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-foreground"
              >
                {field.label}
              </label>
              <input
                id={inputId}
                type="number"
                min={0}
                step={1}
                value={value[field.name]}
                onChange={(event) =>
                  onChange(field.name, Math.max(0, Number(event.target.value)))
                }
                disabled={disabled}
                required
                inputMode="numeric"
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          );
        })}
      </div>

      <div className="flex min-h-11 items-center justify-between gap-4 rounded-md border border-border bg-muted/40 px-4">
        <span className="text-sm font-medium text-foreground">
          Total maximum marks
        </span>
        <output
          aria-live="polite"
          className="text-xl font-semibold tabular-nums text-foreground"
        >
          {total}
        </output>
      </div>
    </fieldset>
  );
}