import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import LoadingButterfly from "@/components/LoadingButterfly";
import { Modal } from "@/components/ui/modal";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import { useAuth } from "@/hooks/useAuth";
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from "@/hooks/useCalendarQueries";
import { useSemester } from "@/hooks/useSemesterQueries";
import { can } from "@/lib/access";
import {
  CALENDAR_EVENT_TYPES,
  type CalendarEvent,
  type CalendarEventType,
  type CreateCalendarEventRequest,
} from "@/types/calendar";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const emptyForm = {
  title: "",
  description: "",
  date: today(),
  type: "EVENT" as CalendarEventType,
};

const eventStyles: Record<CalendarEventType, string> = {
  EVENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  HOLIDAY: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  MEETING: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  DEADLINE: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
};

const Calendar = () => {
  const { projectId = "", centerId = "", semesterId = "" } = useParams();
  const { user } = useAuth();
  const semester = useSemester(semesterId);

  const context = { projectId, centerId, semesterId };
  const canManage = can(user, "calendar.manage", context);

  const [month, setMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const filters = useMemo(
    () => ({ projectId, centerId, semesterId }),
    [projectId, centerId, semesterId],
  );

  const query = useCalendarEvents(filters);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

const events: CalendarEvent[] = query.data ?? [];
  const firstWeekday = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
  ).getDay();

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();

  const monthLabel = month.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const selectedEvents = events.filter(
    (event) => event.date.slice(0, 10) === selectedDate,
  );

  const openCreate = (date = selectedDate) => {
    setEditing(null);
    setForm({ ...emptyForm, date });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      date: event.date.slice(0, 10),
      type: event.type,
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (createEvent.isPending || updateEvent.isPending) return;
    setModalOpen(false);
    setEditing(null);
    setFormError("");
  };

  const submitEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Please enter an event title.");
      return;
    }

    const payload: CreateCalendarEventRequest = {
      ...context,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      date: form.date,
      type: form.type,
    };

    try {
      if (editing) {
        await updateEvent.mutateAsync({
          eventId: editing.id,
          data: {
            title: payload.title,
            description: payload.description,
            date: payload.date,
            type: payload.type,
          },
        });
        toast.success("Calendar event updated.");
      } else {
        await createEvent.mutateAsync(payload);
        toast.success("Calendar event created.");
      }

      setSelectedDate(form.date);
      setMonth(new Date(
        Number(form.date.slice(0, 4)),
        Number(form.date.slice(5, 7)) - 1,
        1,
      ));
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save calendar event.";
      setFormError(message);
    }
  };

  const removeEvent = async (event: CalendarEvent) => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteEvent.mutateAsync(event.id);
      toast.success("Calendar event deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete event.",
      );
    }
  };

  if (query.isLoading || semester.isLoading) return <LoadingButterfly />;

  if (query.isError) {
    return (
      <WorkspacePage>
        <p role="alert" className="rounded-xl border border-destructive p-4 text-sm">
          Unable to load calendar events. Please refresh and try again.
        </p>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        title="Calendar"
        badge={semester.data?.name}
        description="View important events, holidays, meetings and deadlines for this semester."
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => openCreate()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Add event
            </button>
          ) : undefined
        }
      />

      <section className="rounded-2xl border bg-card p-3 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
            className="rounded-lg border p-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h2 className="text-lg font-bold">{monthLabel}</h2>

          <button
            type="button"
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
            className="rounded-lg border p-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-2 text-xs font-semibold text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: firstWeekday }, (_, index) => (
            <div key={`blank-${index}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const dateKey = toDateKey(
              new Date(month.getFullYear(), month.getMonth(), day),
            );
            const dayEvents = events.filter(
              (event) => event.date.slice(0, 10) === dateKey,
            );
            const isSelected = selectedDate === dateKey;
            const isToday = today() === dateKey;

            return (
              <button
                type="button"
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`relative flex min-h-16 flex-col items-center rounded-xl border p-1 text-sm sm:min-h-20 ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:border-border hover:bg-muted"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isToday ? "bg-primary text-primary-foreground" : ""
                  }`}
                >
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="mt-1 flex flex-wrap justify-center gap-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                        title={event.title}
                      />
                    ))}
                  </span>
                )}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">{formatDate(selectedDate)}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => openCreate(selectedDate)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add on this date
            </button>
          )}
        </div>

        {selectedEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No calendar events scheduled for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedEvents.map((event) => (
              <article
                key={event.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        eventStyles[event.type]
                      }`}
                    >
                      {CALENDAR_EVENT_TYPES.find(
                        (item) => item.value === event.type,
                      )?.label ?? event.type}
                    </span>
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
  {event.source === "PLANNING"
    ? "Planned Activity"
    : event.source === "OPERATIONS_EVENT"
      ? "Operations Event"
      : "Calendar"}
</span>
                  </div>
                  {event.description && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                </div>

{canManage && (!event.source || event.source === "CALENDAR") && (
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(event)}
                      aria-label={`Edit ${event.title}`}
                      className="rounded-lg border p-2"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeEvent(event)}
                      aria-label={`Delete ${event.title}`}
                      disabled={deleteEvent.isPending}
                      className="rounded-lg border p-2 text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit calendar event" : "Add calendar event"}
        className="max-h-[90dvh] overflow-y-auto rounded-b-none sm:rounded-lg"
      >
        <form onSubmit={submitEvent} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Title</span>
            <input
              required
              maxLength={120}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="min-h-11 w-full rounded-xl border bg-background px-3"
              placeholder="e.g. Annual day"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Date</span>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="min-h-11 w-full rounded-xl border bg-background px-3"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Category</span>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as CalendarEventType,
                })
              }
              className="min-h-11 w-full rounded-xl border bg-background px-3"
            >
              {CALENDAR_EVENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">
              Description (optional)
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-xl border bg-background p-3"
              placeholder="Add event details..."
            />
          </label>

          {formError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {formError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="min-h-11 flex-1 rounded-xl border font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createEvent.isPending || updateEvent.isPending}
              className="min-h-11 flex-1 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"
            >
              {createEvent.isPending || updateEvent.isPending
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Create event"}
            </button>
          </div>
        </form>
      </Modal>
    </WorkspacePage>
  );
};

export default Calendar;
