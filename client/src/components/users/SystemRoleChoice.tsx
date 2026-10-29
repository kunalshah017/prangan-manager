import { cn } from "@/lib/utils";

export type SystemRole = "USER" | "ADMIN";

const OPTIONS: Array<{ value: SystemRole; label: string; hint: string }> = [
  { value: "USER", label: "Volunteer", hint: "Works through assignments" },
  { value: "ADMIN", label: "Administrator", hint: "Manages everything" },
];

// Two large choices instead of a dropdown: the account type decides whether
// assignments are needed at all, so it should be obvious at a glance.
export function SystemRoleChoice({
  name,
  value,
  onChange,
  disabled = false,
}: {
  name: string;
  value: SystemRole;
  onChange: (value: SystemRole) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="sr-only">Account type</legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex min-h-16 cursor-pointer flex-col justify-center rounded-lg border px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 motion-reduce:transition-none",
              value === option.value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-accent/50",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="text-base font-semibold text-foreground">{option.label}</span>
            <span className="text-sm text-muted-foreground">{option.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
