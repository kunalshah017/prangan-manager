export type CalendarEventType = "EVENT" | "HOLIDAY" | "MEETING" | "DEADLINE";

export interface CalendarEvent {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  title: string;
  description: string | null;
  date: string;
  type: CalendarEventType;
  source: "CALENDAR" | "PLANNING" | "OPERATIONS_EVENT";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventRequest {
  projectId: string;
  centerId: string;
  semesterId: string;
  title: string;
  description?: string;
  date: string;
  type?: CalendarEventType;
}

export type UpdateCalendarEventRequest = Partial<
  Pick<CreateCalendarEventRequest, "title" | "description" | "date" | "type">
>;

export const CALENDAR_EVENT_TYPES: {
  value: CalendarEventType;
  label: string;
}[] = [
  { value: "EVENT", label: "Event" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "MEETING", label: "Meeting" },
  { value: "DEADLINE", label: "Deadline" },
];
