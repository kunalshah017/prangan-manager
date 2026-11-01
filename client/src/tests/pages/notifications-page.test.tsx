// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AttentionNudge } from "@/components/notifications/AttentionNudge";
import Notifications from "@/pages/Notifications";
import type { User } from "@/types/api";

const dismiss = vi.fn();
const notification = (id: string, kind: "UPDATE" | "TASK", title: string) => ({
  id,
  kind,
  title,
  body: "Tulip: not marked yet today.",
  href: "/projects",
  key: kind === "TASK" ? `attendance-staff:s:${id}` : null,
  actionLabel: kind === "TASK" ? "Mark attendance" : null,
  readAt: null,
  createdAt: "2026-10-31T13:00:00.000Z",
});

vi.mock("@/hooks/useNotificationQueries", () => ({
  useNotifications: () => ({
    data: {
      unreadCount: 0,
      notifications: [
        notification("t1", "TASK", "Mark staff attendance"),
        notification("u1", "UPDATE", "New registration request"),
      ],
    },
  }),
  useMarkNotificationsRead: () => ({ mutate: vi.fn() }),
  useDismissNotification: () => ({ mutate: dismiss, isPending: false }),
}));

afterEach(() => {
  cleanup();
  dismiss.mockClear();
});

describe("notifications page", () => {
  it("shows to-dos without a dismiss button and lets updates be dismissed", () => {
    render(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>,
    );
    const todo = screen.getByRole("list", { name: "To do" });
    expect(within(todo).getByText("Mark staff attendance")).toBeTruthy();
    expect(within(todo).getByRole("link", { name: "Mark attendance" }).getAttribute("href")).toBe("/projects");
    expect(within(todo).queryByRole("button")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss: New registration request" }));
    expect(dismiss).toHaveBeenCalledWith("u1");
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(dismiss).toHaveBeenLastCalledWith(undefined);
  });

  it("asks only educators and centre managers without full bank details", async () => {
    const { needsBankDetails } = await vi.importActual<typeof import("@/hooks/useNotificationQueries")>(
      "@/hooks/useNotificationQueries",
    );
    const educator = { roleAssignments: [{ subRole: "EDUCATOR", isActive: true }] } as User;
    const bank = { bankAccountNumber: "1", bankAccountName: "A", bankIfsc: "X", bankName: "B", bankBranch: "C", upiId: "u@x" };
    expect(needsBankDetails(educator)).toBe(true);
    expect(needsBankDetails({ ...educator, ...bank })).toBe(false);
    expect(needsBankDetails({ roleAssignments: [{ subRole: "TECH", isActive: true }] } as User)).toBe(false);
    expect(needsBankDetails({ roleAssignments: [{ subRole: "EDUCATOR", isActive: false }] } as User)).toBe(false);
    expect(needsBankDetails(null)).toBe(false);
  });
});

describe("attention nudge", () => {
  it("says what needs attention, links to notifications and hides after a few seconds", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <MemoryRouter>
          <AttentionNudge count={1} />
        </MemoryRouter>,
      );
      expect(screen.getByRole("link", { name: "Something needs your attention" }).getAttribute("href")).toBe("/notifications");
      act(() => vi.advanceTimersByTime(5000));
      expect(screen.queryByRole("status")).toBeNull();

      rerender(
        <MemoryRouter>
          <AttentionNudge key="again" count={2} />
        </MemoryRouter>,
      );
      expect(screen.getByText("2 things need your attention")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
