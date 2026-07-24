const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

const validDateOnly = (value: string) =>
  dateOnly.test(value) &&
  new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

export const parseRemunerationPeriodInput = (input: unknown) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Remuneration details are required.");
  }
  const record = input as Record<string, unknown>;
  if (
    Object.keys(record).some(
      (key) => !["userId", "amountPerDay", "effectiveFrom"].includes(key),
    )
  ) {
    throw new Error("Remuneration details contain unsupported fields.");
  }
  const userId = typeof record.userId === "string" ? record.userId.trim() : "";
  const { amountPerDay, effectiveFrom } = record;
  if (
    !userId ||
    typeof amountPerDay !== "number" ||
    !Number.isFinite(amountPerDay) ||
    amountPerDay < 0 ||
    Math.round(amountPerDay * 100) !== amountPerDay * 100
  ) {
    throw new Error(
      "Daily remuneration must be zero or more with at most two decimal places.",
    );
  }
  if (typeof effectiveFrom !== "string" || !validDateOnly(effectiveFrom)) {
    throw new Error("Effective from must be a valid date.");
  }
  return { userId, amountPerDay, effectiveFrom };
};
