import { useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Link } from "react-router-dom";

import { PageTitle } from "@/components/navigation/PageTitle";
import { EntityList, EntityRow } from "@/components/workspace/EntityList";
import { EmptyState, ErrorState, ListPageSkeleton } from "@/components/workspace/PageState";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import { useDismissNotification, useMarkNotificationsRead, useNotifications } from "@/hooks/useNotificationQueries";
import { buttonVariants } from "@/lib/button-variants";
import { formatMoment } from "@/lib/dates";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationsRead();
  const dismiss = useDismissNotification();
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const { mutate: markAllRead } = markRead;
  const all = notificationsQuery.data?.notifications ?? [];
  const tasks = all.filter((notification) => notification.kind === "TASK");
  const updates = all.filter((notification) => notification.kind === "UPDATE");

  // Opening the list counts as reading it; this visit still shows which were new.
  useEffect(() => {
    if (unreadCount > 0) markAllRead();
  }, [unreadCount, markAllRead]);

  return (
    <WorkspacePage className="max-w-3xl">
      <PageTitle title="Notifications" />
      {notificationsQuery.isLoading ? (
        <ListPageSkeleton label="Loading notifications" rows={4} />
      ) : notificationsQuery.error ? (
        <ErrorState
          title="Notifications could not be loaded"
          description="Check your connection and try again."
          onRetry={() => void notificationsQuery.refetch()}
        />
      ) : all.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="Reminders and updates for you will show up here."
        />
      ) : (
        <div className="space-y-6">
          {tasks.length > 0 && (
            <section aria-labelledby="todo-title" className="space-y-3">
              <h2 id="todo-title" className="text-lg font-semibold text-foreground">
                To do
              </h2>
              <EntityList label="To do" className="border-warning/50 bg-warning/10">
                {/* A to-do goes once its action is done, so the button names that action. */}
                {tasks.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground">{notification.title}</p>
                      <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{notification.body}</p>
                    </div>
                    {notification.href && (
                      <Link
                        to={notification.href}
                        className={cn(buttonVariants(), "min-h-11 shrink-0 self-start sm:self-auto")}
                      >
                        {notification.actionLabel ?? "Open"}
                      </Link>
                    )}
                  </li>
                ))}
              </EntityList>
            </section>
          )}

          {updates.length > 0 && (
            <section aria-labelledby="updates-title" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="updates-title" className="text-lg font-semibold text-foreground">
                  Updates
                </h2>
                <button
                  type="button"
                  onClick={() => dismiss.mutate(undefined)}
                  disabled={dismiss.isPending}
                  className="-mr-2 min-h-11 rounded-md px-2 text-sm font-semibold text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                >
                  Clear all
                </button>
              </div>
              <EntityList label="Updates">
                {updates.map((notification) => (
                  <EntityRow
                    key={notification.id}
                    href={notification.href ?? undefined}
                    title={notification.title}
                    leading={
                      <span
                        className={notification.readAt ? "h-2.5 w-2.5 shrink-0" : "h-2.5 w-2.5 shrink-0 rounded-full bg-primary"}
                        aria-label={notification.readAt ? undefined : "New"}
                        role={notification.readAt ? undefined : "img"}
                      />
                    }
                    meta={
                      <>
                        <span className="block">{notification.body}</span>
                        <span className="mt-0.5 block text-xs tabular-nums">{formatMoment(notification.createdAt)}</span>
                      </>
                    }
                    action={
                      <button
                        type="button"
                        aria-label={`Dismiss: ${notification.title}`}
                        onClick={() => dismiss.mutate(notification.id)}
                        className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    }
                  />
                ))}
              </EntityList>
            </section>
          )}
        </div>
      )}
    </WorkspacePage>
  );
}
