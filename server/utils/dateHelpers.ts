/**
 * Utility functions for handling date conversions in the API
 */

// Calendar days (attendance, exam, semester, birth dates) travel as
// "YYYY-MM-DD" and live in DATE columns. Prisma stores a Date's UTC day there,
// so a day is passed as its UTC midnight and read back with toISOString().slice(0, 10).
export const calendarDate = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

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
