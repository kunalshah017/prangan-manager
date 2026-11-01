import { isValidDateFormat } from "../utils/dateHelpers.js";

export type CalendarEventInput = {
  projectId: string;
  centerId: string;
  semesterId: string;
  title: string;
  description?: string;
  date: string;
  type?: "EVENT" | "HOLIDAY" | "MEETING" | "DEADLINE";
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value === value.trim();

export const parseCalendarEventInput = (
  value: unknown,
): { data: CalendarEventInput } | { error: string } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Invalid calendar event data" };
  }

  const body = value as Record<string, unknown>;
  const allowedTypes = ["EVENT", "HOLIDAY", "MEETING", "DEADLINE"];

  if (
    !isNonEmptyString(body.projectId) ||
    !isNonEmptyString(body.centerId) ||
    !isNonEmptyString(body.semesterId)
  ) {
    return { error: "Project, centre and semester are required" };
  }

  if (!isNonEmptyString(body.title) || body.title.length > 200) {
    return { error: "Title is required and must be at most 200 characters" };
  }

  if (
    typeof body.date !== "string" ||
    !isValidDateFormat(body.date) ||
    new Date(`${body.date}T00:00:00.000Z`).toISOString().slice(0, 10) !== body.date
  ) {
    return { error: "Date must be a valid date in YYYY-MM-DD format" };
  }

  if (
    body.description !== undefined &&
    body.description !== null &&
    (typeof body.description !== "string" || body.description.length > 5000)
  ) {
    return { error: "Description must be at most 5000 characters" };
  }

  if (body.type !== undefined && !allowedTypes.includes(body.type as string)) {
    return { error: "Invalid calendar event type" };
  }

  return {
    data: {
      projectId: body.projectId,
      centerId: body.centerId,
      semesterId: body.semesterId,
      title: body.title,
      description: body.description as string | undefined,
      date: body.date,
      type: (body.type as CalendarEventInput["type"]) ?? "EVENT",
    },
  };
};

export const parseCalendarEventUpdate = (
  value: unknown,
): {
  data: Partial<Pick<CalendarEventInput, "title" | "description" | "date" | "type">>;
} | { error: string } => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "Invalid calendar event update" };
  }

  const body = value as Record<string, unknown>;
  const data: Partial<Pick<CalendarEventInput, "title" | "description" | "date" | "type">> = {};

  if (Object.keys(body).length === 0) {
    return { error: "At least one field is required" };
  }

  if ("title" in body) {
    if (!isNonEmptyString(body.title) || body.title.length > 200) {
      return { error: "Title must be at most 200 characters" };
    }
    data.title = body.title;
  }

  if ("description" in body) {
    if (
      body.description !== null &&
      (typeof body.description !== "string" || body.description.length > 5000)
    ) {
      return { error: "Description must be at most 5000 characters" };
    }
    data.description = body.description as string | undefined;
  }

  if ("date" in body) {
    if (
      typeof body.date !== "string" ||
      !isValidDateFormat(body.date) ||
      new Date(`${body.date}T00:00:00.000Z`).toISOString().slice(0, 10) !== body.date
    ) {
      return { error: "Date must be a valid date in YYYY-MM-DD format" };
    }
    data.date = body.date;
  }

  if ("type" in body) {
    if (!["EVENT", "HOLIDAY", "MEETING", "DEADLINE"].includes(body.type as string)) {
      return { error: "Invalid calendar event type" };
    }
    data.type = body.type as CalendarEventInput["type"];
  }

  return { data };
};
