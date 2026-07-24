export interface PersonNameParts {
  firstName: string;
  middleName: string | null;
  lastName: string | null;
}

export interface PersonNameInput {
  name?: unknown;
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
}

export interface ResolvedPersonName extends PersonNameParts {
  name: string;
}

const nameFields = ["name", "firstName", "middleName", "lastName"] as const;

export const normalizePersonName = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const normalizeRequiredPart = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("First name is required.");
  }

  const normalized = normalizePersonName(value);
  if (!normalized) {
    throw new Error("First name is required.");
  }
  return normalized;
};

const normalizeOptionalPart = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Optional name fields must be strings or null.");
  }
  return normalizePersonName(value) || null;
};

export const composePersonName = (parts: PersonNameParts): string =>
  [parts.firstName, parts.middleName, parts.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ");

export const parseLegacyPersonName = (name: unknown): PersonNameParts => {
  if (typeof name !== "string") {
    throw new Error("First name is required.");
  }

  const normalized = normalizePersonName(name);
  if (!normalized) {
    throw new Error("First name is required.");
  }

  const tokens = normalized.split(" ");
  if (tokens.length === 1) {
    return { firstName: tokens[0], middleName: null, lastName: null };
  }
  if (tokens.length === 2) {
    return { firstName: tokens[0], middleName: null, lastName: tokens[1] };
  }

  return {
    firstName: tokens[0],
    middleName: tokens.slice(1, -1).join(" "),
    lastName: tokens[tokens.length - 1] ?? null,
  };
};

const resolveStructuredName = (
  input: PersonNameInput,
  current?: PersonNameParts,
): PersonNameParts => ({
  firstName: normalizeRequiredPart(
    input.firstName === undefined ? current?.firstName : input.firstName,
  ),
  middleName:
    input.middleName === undefined
      ? (current?.middleName ?? null)
      : normalizeOptionalPart(input.middleName),
  lastName:
    input.lastName === undefined
      ? (current?.lastName ?? null)
      : normalizeOptionalPart(input.lastName),
});

const withDisplayName = (parts: PersonNameParts): ResolvedPersonName => ({
  name: composePersonName(parts),
  ...parts,
});

const hasStructuredFields = (input: PersonNameInput): boolean =>
  ["firstName", "middleName", "lastName"].some((field) =>
    Object.prototype.hasOwnProperty.call(input, field),
  );

const assertLegacyMatches = (
  legacyName: unknown,
  parts: PersonNameParts,
): void => {
  if (
    typeof legacyName !== "string" ||
    normalizePersonName(legacyName) !== composePersonName(parts)
  ) {
    throw new Error("Legacy name does not match structured name fields.");
  }
};

export const resolvePersonNameCreate = (
  input: PersonNameInput,
): ResolvedPersonName => {
  if (!hasStructuredFields(input)) {
    return withDisplayName(parseLegacyPersonName(input.name));
  }

  const parts = resolveStructuredName(input);
  if (Object.prototype.hasOwnProperty.call(input, "name")) {
    assertLegacyMatches(input.name, parts);
  }
  return withDisplayName(parts);
};

export const resolvePersonNameUpdate = (
  input: PersonNameInput,
  current: PersonNameParts,
): ResolvedPersonName | null => {
  const hasNameInput = nameFields.some((field) =>
    Object.prototype.hasOwnProperty.call(input, field),
  );
  if (!hasNameInput) return null;

  if (!hasStructuredFields(input)) {
    return withDisplayName(parseLegacyPersonName(input.name));
  }

  const parts = resolveStructuredName(input, current);
  if (Object.prototype.hasOwnProperty.call(input, "name")) {
    assertLegacyMatches(input.name, parts);
  }
  return withDisplayName(parts);
};
