import { prisma } from "../lib/prisma.js";
import type { CalendarEventInput } from "../security/calendar-input.js";
import type { CalendarEventResponse } from "../types/calendar.types.js";

type CalendarScope = {
  projectId: string;
  centerId: string;
  semesterId: string;
};

const toDate = (date: string): Date =>
  new Date(`${date}T00:00:00.000Z`);

const toResponse = (event: {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  title: string;
  description: string | null;
  startDate: Date;
  eventType: string;
  createdAt: Date;
  updatedAt: Date;
}): CalendarEventResponse => ({
  id: event.id,
  projectId: event.projectId,
  centerId: event.centerId,
  semesterId: event.semesterId,
  title: event.title,
  description: event.description,
  date: event.startDate.toISOString().slice(0, 10),
  type: event.eventType as CalendarEventResponse["type"],
  source: "CALENDAR",
  createdAt: event.createdAt.toISOString(),
  updatedAt: event.updatedAt.toISOString(),
});

export const validateCalendarScope = async (
  scope: CalendarScope,
): Promise<boolean> => {
  const semester = await prisma.semesters.findFirst({
    where: {
      id: scope.semesterId,
      centerId: scope.centerId,
      center: { projectId: scope.projectId },
    },
    select: { id: true },
  });

  return Boolean(semester);
};

export const getCalendarEvents = async (
  scope: CalendarScope,
): Promise<CalendarEventResponse[]> => {
  const [calendarEvents, planningItems, managedEvents] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: scope,
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.planningItem.findMany({
      where: scope,
      orderBy: { startAt: "asc" },
    }),
    prisma.managedEvent.findMany({
      where: scope,
      orderBy: { eventDate: "asc" },
    }),
  ]);

  const originalEvents = calendarEvents.map(toResponse);

  const plannedActivities: CalendarEventResponse[] = planningItems.map(
    (item) => ({
      id: `planning-${item.id}`,
      projectId: item.projectId,
      centerId: item.centerId,
      semesterId: item.semesterId,
      title: item.title,
      description: item.description,
      date: item.startAt.toISOString().slice(0, 10),
      type: item.activityType.toUpperCase().includes("DEADLINE")
        ? "DEADLINE"
        : item.activityType.toUpperCase().includes("MEETING")
          ? "MEETING"
          : "EVENT",
      source: "PLANNING",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }),
  );

  const operationsEvents: CalendarEventResponse[] = managedEvents.map(
    (event) => ({
      id: `operations-event-${event.id}`,
      projectId: event.projectId,
      centerId: event.centerId,
      semesterId: event.semesterId,
      title: event.title,
      description: event.description,
      date: event.eventDate.toISOString().slice(0, 10),
      type: "EVENT",
      source: "OPERATIONS_EVENT",
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }),
  );

  return [...originalEvents, ...plannedActivities, ...operationsEvents].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt.localeCompare(b.createdAt),
  );
};

export const getCalendarEventScope = async (eventId: string) => {
  return prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      projectId: true,
      centerId: true,
      semesterId: true,
    },
  });
};

export const createCalendarEvent = async (
  input: CalendarEventInput,
  createdById: string,
): Promise<CalendarEventResponse> => {
  const date = toDate(input.date);

  const event = await prisma.calendarEvent.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      eventType: input.type ?? "EVENT",
      startDate: date,
      endDate: date,
      allDay: true,
      projectId: input.projectId,
      centerId: input.centerId,
      semesterId: input.semesterId,
      createdById,
    },
  });

  return toResponse(event);
};

export const updateCalendarEvent = async (
  eventId: string,
  input: {
    title?: string;
    description?: string;
    date?: string;
    type?: CalendarEventInput["type"];
  },
): Promise<CalendarEventResponse> => {
  const data: {
    title?: string;
    description?: string | null;
    startDate?: Date;
    endDate?: Date;
    eventType?: string;
  } = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.date !== undefined) {
    const date = toDate(input.date);
    data.startDate = date;
    data.endDate = date;
  }
  if (input.type !== undefined) data.eventType = input.type;

  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data,
  });

  return toResponse(event);
};

export const deleteCalendarEvent = async (
  eventId: string,
): Promise<void> => {
  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });
};