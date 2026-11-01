import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";
import { hasCompleteBankDetails } from "@/lib/dashboard";
import { queryKeys } from "@/lib/query-client";
import { useAuthStore } from "@/stores/authStore";
import type { User } from "@/types/api";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  href: string | null;
  // A to-do can't be dismissed: it goes once the work is done, or at midnight.
  kind: "UPDATE" | "TASK";
  key: string | null;
  // A to-do's button text, e.g. "Mark attendance"; the button opens href.
  actionLabel: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

// Worked out from the profile, not stored: no expiry, and it goes the moment
// the details are saved. Educators and centre managers are the ones paid.
export const BANK_DETAILS_TASK: AppNotification = {
  id: "bank-details",
  kind: "TASK",
  key: null,
  title: "Add your bank details",
  body: "Needed to pay your remuneration.",
  href: "/profile#payment",
  actionLabel: "Add bank details",
  readAt: null,
  createdAt: "",
};

export const needsBankDetails = (user: User | null) =>
  Boolean(
    user?.roleAssignments?.some(
      (assignment) => assignment.isActive && (assignment.subRole === "EDUCATOR" || assignment.subRole === "CENTER_MANAGER"),
    ),
  ) && !hasCompleteBankDetails(user);

// No polling: the list refreshes when the app comes back into view and when a
// push arrives, so an idle open tab never keeps the database awake.
export const useNotifications = () => {
  const needsBank = useAuthStore((state) => needsBankDetails(state.user));
  const select = useCallback(
    (data: NotificationsResponse) =>
      needsBank ? { ...data, notifications: [BANK_DETAILS_TASK, ...data.notifications] } : data,
    [needsBank],
  );
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get<NotificationsResponse>("/notifications"),
    select,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/notifications/read"),
    // Clear the badge but keep this visit's unread dots until the next refresh.
    onSuccess: () =>
      queryClient.setQueryData<NotificationsResponse>(queryKeys.notifications, (current) =>
        current && { ...current, unreadCount: 0 },
      ),
  });
};

// Dismisses one update, or every update when no id is given.
export const useDismissNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id?: string) => api.post("/notifications/dismiss", id ? { id } : { all: true }),
    onSuccess: (_result, id) =>
      queryClient.setQueryData<NotificationsResponse>(queryKeys.notifications, (current) =>
        current && {
          ...current,
          notifications: current.notifications.filter(
            (notification) => notification.kind === "TASK" || (id !== undefined && notification.id !== id),
          ),
        },
      ),
    onError: () => toast.error("Couldn't dismiss. Try again."),
  });
};

// null when the server has no push keys: the app then runs without push.
export const fetchPushKey = async (): Promise<string | null> => {
  try {
    return (await api.get<{ publicKey: string }>("/notifications/push-key")).publicKey;
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) return null;
    throw error;
  }
};
