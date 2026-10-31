import { isValidDateFormat } from "../utils/dateHelpers.js";
import { hasAtMostTwoDecimals } from "../utils/money.js";

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
    !hasAtMostTwoDecimals(amountPerDay)
  ) {
    throw new Error(
      "Daily remuneration must be zero or more with at most two decimal places.",
    );
  }
  if (typeof effectiveFrom !== "string" || !isValidDateFormat(effectiveFrom)) {
    throw new Error("Effective from must be a valid date.");
  }
  return { userId, amountPerDay, effectiveFrom };
};
