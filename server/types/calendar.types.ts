export type CalendarEventType = "EVENT" | "HOLIDAY" | "MEETING" | "DEADLINE";

export type CalendarEventSource =
  | "CALENDAR"
  | "PLANNING"
  | "OPERATIONS_EVENT";

export interface CalendarEventResponse {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  title: string;
  description: string | null;
  date: string;
  type: CalendarEventType;
  source: CalendarEventSource;
  createdAt: string;
  updatedAt: string;
}