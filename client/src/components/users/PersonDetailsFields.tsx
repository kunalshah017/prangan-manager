import { PersonNameFields, type PersonNameField } from "@/components/ui";
import { Input, Textarea } from "@/components/ui/form-controls";
import { FormField } from "@/components/workspace/FormParts";

export type PersonDetails = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  qualification: string;
  dob: string;
  address: string;
};

export type PersonDetailsField = keyof PersonDetails;

interface PersonDetailsFieldsProps {
  idPrefix: string;
  values: PersonDetails;
  onChange: (field: PersonDetailsField, value: string) => void;
  errors?: Partial<Record<PersonDetailsField, string>>;
  disabled?: boolean;
}

// The same details, with the same labels, whether someone edits their own
// profile or an admin edits theirs.
export function PersonDetailsFields({ idPrefix, values, onChange, errors = {}, disabled = false }: PersonDetailsFieldsProps) {
  const field = (name: PersonDetailsField, label: string, type: string, autoComplete: string) => (
    <FormField htmlFor={`${idPrefix}-${name}`} label={label} required={name === "email"}>
      <Input
        id={`${idPrefix}-${name}`}
        type={type}
        value={values[name]}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${idPrefix}-${name}-error` : undefined}
        onChange={(event) => onChange(name, event.target.value)}
      />
      {errors[name] && <p id={`${idPrefix}-${name}-error`} className="mt-1.5 text-sm text-destructive">{errors[name]}</p>}
    </FormField>
  );

  return (
    <div className="space-y-4">
      <PersonNameFields
        idPrefix={idPrefix}
        firstName={values.firstName}
        middleName={values.middleName}
        lastName={values.lastName}
        onChange={(name: PersonNameField, value: string) => onChange(name, value)}
        errors={{ firstName: errors.firstName }}
        disabled={disabled}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {field("email", "Email", "email", "email")}
        {field("phone", "Phone", "tel", "tel")}
        {field("qualification", "Qualification", "text", "off")}
        {field("dob", "Date of birth", "date", "bday")}
      </div>
      <FormField htmlFor={`${idPrefix}-address`} label="Address">
        <Textarea
          id={`${idPrefix}-address`}
          rows={3}
          value={values.address}
          autoComplete="street-address"
          disabled={disabled}
          onChange={(event) => onChange("address", event.target.value)}
        />
      </FormField>
    </div>
  );
}
