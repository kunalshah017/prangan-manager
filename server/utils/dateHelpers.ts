/**
 * Utility functions for handling date conversions in the API
 */

/**
 * Converts a date string to a proper Date object for database storage
 * @param dateInput - Date string or Date object
 * @param isEndDate - If true, sets time to end of day (23:59:59.999)
 * @returns Date object or undefined if input is invalid
 */
export const convertToDateTime = (
  dateInput: string | Date | undefined,
  isEndDate: boolean = false,
): Date | undefined => {
  if (!dateInput) return undefined;

  if (dateInput instanceof Date) {
    return dateInput;
  }

  if (typeof dateInput === "string") {
    // If it's already an ISO string with time, use it directly
    if (dateInput.includes("T")) {
      return new Date(dateInput);
    }

    // If it's just a date (YYYY-MM-DD), add time
    const timeStr = isEndDate ? "T23:59:59.999Z" : "T00:00:00.000Z";
    return new Date(`${dateInput}${timeStr}`);
  }

  return undefined;
};

/**
 * Formats a Date object to ISO string for API responses
 * @param date - Date object
 * @returns ISO string or null if date is invalid
 */
export const formatDateForResponse = (
  date: Date | null | undefined,
): string | null => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

/**
 * Validates if a date string is in YYYY-MM-DD format
 * @param dateString - Date string to validate
 * @returns boolean indicating if format is valid
 */
export const isValidDateFormat = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Validates if a date string is in ISO 8601 format
 * @param dateString - Date string to validate
 * @returns boolean indicating if format is valid
 */
export const isValidISOFormat = (dateString: string): boolean => {
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime());
};
