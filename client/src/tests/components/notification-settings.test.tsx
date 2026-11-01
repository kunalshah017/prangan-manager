// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationPrompt } from "@/components/notifications/NotificationPrompt";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { detectPlatform } from "@/lib/push";

const mocks = vi.hoisted(() => ({
  fetchPushKey: vi.fn(),
  pushSupport: vi.fn(),
  currentSubscription: vi.fn(),
  subscribeDevice: vi.fn(),
  unsubscribeDevice: vi.fn(),
}));

vi.mock("@/hooks/useNotificationQueries", () => ({ fetchPushKey: mocks.fetchPushKey }));
vi.mock("@/lib/push", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/push")>()),
  pushSupport: mocks.pushSupport,
  currentSubscription: mocks.currentSubscription,
  subscribeDevice: mocks.subscribeDevice,
  unsubscribeDevice: mocks.unsubscribeDevice,
}));

const setPermission = (permission: NotificationPermission, requested: NotificationPermission = permission) => {
  vi.stubGlobal("Notification", { permission, requestPermission: vi.fn().mockResolvedValue(requested) });
};

beforeEach(() => {
  mocks.pushSupport.mockReturnValue("supported");
  mocks.fetchPushKey.mockResolvedValue("public-key");
  mocks.currentSubscription.mockResolvedValue(null);
  mocks.subscribeDevice.mockResolvedValue(undefined);
  mocks.unsubscribeDevice.mockResolvedValue(undefined);
  setPermission("default", "granted");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("push status for this device", () => {
  it.each([
    ["off", () => undefined],
    ["on", () => mocks.currentSubscription.mockResolvedValue({ endpoint: "https://fcm.googleapis.com/x" })],
    ["blocked", () => setPermission("denied")],
    ["unavailable", () => mocks.fetchPushKey.mockResolvedValue(null)],
    ["unavailable", () => mocks.fetchPushKey.mockRejectedValue(new Error("offline"))],
  ])("reads %s", async (expected, arrange) => {
    arrange();
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe(expected));
  });

  it("asks iPhone users in Safari to install, without calling the server", () => {
    mocks.pushSupport.mockReturnValue("install");
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.status).toBe("install");
    expect(mocks.fetchPushKey).not.toHaveBeenCalled();
  });

  it("turns on after the browser allows it, and off again", async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("off"));
    await act(() => result.current.turnOn());
    expect(mocks.subscribeDevice).toHaveBeenCalledWith("public-key");
    expect(result.current.status).toBe("on");
    await act(() => result.current.turnOff());
    expect(mocks.unsubscribeDevice).toHaveBeenCalled();
    expect(result.current.status).toBe("off");
  });

  it("stays off and shows blocked when the browser prompt is refused", async () => {
    setPermission("default", "denied");
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("off"));
    await act(() => result.current.turnOn());
    expect(mocks.subscribeDevice).not.toHaveBeenCalled();
    expect(result.current.status).toBe("blocked");
  });
});

describe("prompt after signing in", () => {
  const renderPrompt = (onDone = vi.fn()) => {
    render(
      <MemoryRouter>
        <NotificationPrompt onDone={onDone} />
      </MemoryRouter>,
    );
    return onDone;
  };

  it("offers to turn notifications on and closes once answered", async () => {
    const onDone = renderPrompt();
    fireEvent.click(await screen.findByRole("button", { name: "Turn on" }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mocks.subscribeDevice).toHaveBeenCalledWith("public-key");
  });

  it("can be dismissed", async () => {
    const onDone = renderPrompt();
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(onDone).toHaveBeenCalled();
    expect(mocks.subscribeDevice).not.toHaveBeenCalled();
  });

  it("does not show when notifications are already on", async () => {
    mocks.currentSubscription.mockResolvedValue({ endpoint: "https://fcm.googleapis.com/x" });
    const onDone = renderPrompt();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(screen.queryByText("Turn on notifications")).toBeNull();
  });
});

describe("platform detection", () => {
  it("tells iPhones and iPads (which claim to be Macs) apart from Android and desktops", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe("desktop");
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9)", 5)).toBe("android");
  });
});

describe("when the prompt is due", () => {
  it("is due on devices that never answered, 5 days after each answer, and after signing in", async () => {
    const { isNotificationPromptDue, markNotificationPromptAnswered, markNotificationPromptDue } =
      await vi.importActual<typeof import("@/lib/push")>("@/lib/push");
    const day = 24 * 60 * 60 * 1000;
    const answeredAt = Date.UTC(2026, 10, 1);
    localStorage.clear();
    expect(isNotificationPromptDue(answeredAt)).toBe(true); // already signed in before this release
    markNotificationPromptAnswered(answeredAt);
    expect(isNotificationPromptDue(answeredAt + 4 * day)).toBe(false);
    expect(isNotificationPromptDue(answeredAt + 5 * day)).toBe(true);
    markNotificationPromptDue(); // signed in again a day later
    expect(isNotificationPromptDue(answeredAt + day)).toBe(true);
  });
});
