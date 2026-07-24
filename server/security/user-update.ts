const profileFields = [
  "name",
  "firstName",
  "middleName",
  "lastName",
  "email",
  "phone",
  "qualification",
  "address",
  "dob",
  "profileImageUrl",
] as const;

const privilegedFields = new Set([
  "role",
  "roleAssignments",
  "status",
  "reimbursementAmount",
  "bankAccountNumber",
  "bankAccountName",
  "bankIfsc",
  "bankName",
  "bankBranch",
  "upiId",
]);

type ProfileField = (typeof profileFields)[number];

export type GeneralUserUpdateData = Partial<Record<ProfileField, unknown>>;

export const extractGeneralUserUpdate = (
  input: unknown,
): {
  data: GeneralUserUpdateData;
  forbiddenFields: string[];
  unknownFields: string[];
} => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { data: {}, forbiddenFields: [], unknownFields: ["body"] };
  }

  const record = input as Record<string, unknown>;
  const data: GeneralUserUpdateData = {};
  const allowedFields = new Set<string>(profileFields);

  for (const field of profileFields) {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      data[field] = record[field];
    }
  }

  const disallowedFields = Object.keys(record)
    .filter((field) => !allowedFields.has(field))
    .sort();

  return {
    data,
    forbiddenFields: disallowedFields.filter((field) =>
      privilegedFields.has(field),
    ),
    unknownFields: disallowedFields.filter(
      (field) => !privilegedFields.has(field),
    ),
  };
};
