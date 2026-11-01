import { api } from "@/lib/api-client";

export type Platform = "ios" | "android" | "desktop";

export const detectPlatform = (userAgent = navigator.userAgent, maxTouchPoints = navigator.maxTouchPoints): Platform => {
  // iPads report a Mac user agent; touch support gives them away.
  if (/iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return "ios";
  return /Android/.test(userAgent) ? "android" : "desktop";
};

export const isInstalledApp = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iPhones only offer push to the app added to the Home Screen; other browsers
// without it (in-app browsers, old versions) can't be fixed by installing.
export const pushSupport = (platform: Platform = detectPlatform()): "supported" | "install" | "unsupported" => {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "supported";
  return platform === "ios" && !isInstalledApp() ? "install" : "unsupported";
};

const keyBytes = (base64Url: string) => {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

const sameKey = (current: ArrayBuffer | null, expected: Uint8Array) =>
  !!current && current.byteLength === expected.length && new Uint8Array(current).every((byte, index) => byte === expected[index]);

export const currentSubscription = async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
};

// Subscribes this device and stores it on the server.
export const subscribeDevice = async (publicKey: string) => {
  // ready never settles if the service worker failed to register.
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker not ready")), 10_000)),
  ]);
  const applicationServerKey = keyBytes(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  // A subscription made with an older server key can't receive new pushes.
  if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
  await api.put("/notifications/subscription", subscription.toJSON());
};

// Turning off, and signing out: the next person on a shared phone must not
// get this user's pushes.
export const unsubscribeDevice = async () => {
  if (!("serviceWorker" in navigator)) return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api.post("/notifications/subscription/remove", { endpoint: subscription.endpoint }).catch(() => undefined);
  await subscription.unsubscribe();
};

// A to-do's phone notification stays on the lock screen after it is done or
// expired; once the app has the current list, take those down.
export const closeFinishedTaskNotifications = async (openKeys: string[]) => {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  for (const shown of (await registration?.getNotifications()) ?? []) {
    if (shown.data?.key && !openKeys.includes(shown.data.key)) shown.close();
  }
};

// The notifications prompt comes back 5 days after it was last answered or
// dismissed, and after each sign-in, while notifications are still off. A
// device that never answered (everyone already signed in when this shipped)
// sees it straight away.
const PROMPT_ANSWERED_AT_KEY = "pm-notification-prompt-at";
const PROMPT_REPEAT_MS = 5 * 24 * 60 * 60 * 1000;

export const isNotificationPromptDue = (now = Date.now()) => {
  try {
    const answeredAt = Number(localStorage.getItem(PROMPT_ANSWERED_AT_KEY));
    return !answeredAt || now - answeredAt >= PROMPT_REPEAT_MS;
  } catch {
    // Can't remember an answer, so don't ask on every start; Settings has the switch.
    return false;
  }
};

export const markNotificationPromptDue = () => {
  try {
    localStorage.removeItem(PROMPT_ANSWERED_AT_KEY);
  } catch {
    // Storage blocked: see isNotificationPromptDue.
  }
};

export const markNotificationPromptAnswered = (now = Date.now()) => {
  try {
    localStorage.setItem(PROMPT_ANSWERED_AT_KEY, String(now));
  } catch {
    // Nothing to remember it in.
  }
};
