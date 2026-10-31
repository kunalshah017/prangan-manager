// Two kinds of time, one rule each:
//  * Calendar days (semester, attendance, exam, expense and birth dates) are
//    the same day for every viewer. The API stores them as days and sends
//    "YYYY-MM-DD" or "YYYY-MM-DDT00:00:00.000Z"; only the first 10 characters
//    count. Never pass them through the viewer's time zone.
//  * Moments (created, marked, voided, sent) are UTC instants. Show them in
//    the viewer's own time zone.
// "Today" for business rules (default class day, running semester, paid month)
// is the day in India, where the centres are, wherever the viewer is. The
// server uses the same rule (indiaToday in server/lib/role-assignments.ts).

export const APP_TIME_ZONE = "Asia/Kolkata";

// The India calendar day of an instant, as "YYYY-MM-DD".
export const indiaDate = (moment: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export const indiaToday = (now: Date = new Date()): string => indiaDate(now);

export const calendarDay = (value: string): string => value.slice(0, 10);

export const formatCalendarDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
  locale = "en-GB",
): string =>
  new Date(`${calendarDay(value)}T00:00:00.000Z`).toLocaleDateString(locale, {
    ...options,
    timeZone: "UTC",
  });

export const formatMoment = (
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
  locale = "en-GB",
): string => new Date(value).toLocaleString(locale, options);
