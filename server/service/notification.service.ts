import webpush from "web-push";

import { roleLabels } from "../email/semester-activation-email.js";
import type { NotificationKind, SubRole } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";

export type NotificationMessage = {
  title: string;
  body: string;
  href?: string;
  kind?: NotificationKind;
  key?: string;
  expiresAt?: Date;
  // A to-do's button text: the action that gets it done.
  actionLabel?: string;
  // Lock-screen text when body names people (not stored): the app shows body.
  pushBody?: string;
};

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// The server posts to whatever endpoint a browser hands it, so only the push
// services browsers actually use are accepted.
const PUSH_HOST_SUFFIXES = [
  ".googleapis.com", // Chrome, Edge on Android, Samsung Internet
  ".push.services.mozilla.com", // Firefox
  ".push.apple.com", // Safari, installed apps on iPhone
  ".notify.windows.com", // Edge on Windows
];

const isPushEndpoint = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      PUSH_HOST_SUFFIXES.some((suffix) => `.${url.hostname}`.endsWith(suffix))
    );
  } catch {
    return false;
  }
};

const isKey = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength && /^[A-Za-z0-9_-]+=*$/.test(value);

// Accepts the JSON a browser's PushSubscription produces; anything else is null.
export const parsePushSubscription = (body: unknown): PushSubscriptionInput | null => {
  const subscription = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 1000 || !isPushEndpoint(endpoint)) return null;
  if (!isKey(p256dh, 200) || !isKey(auth, 100)) return null;
  return { endpoint, p256dh, auth };
};

export const pushPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

let vapidReady = false;
const pushConfigured = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!vapidReady) {
    // Push services contact this address if the app's messages cause trouble.
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://manager.pranganfoundation.org", publicKey, privateKey);
    vapidReady = true;
  }
  return true;
};

export const saveSubscription = (userId: string, subscription: PushSubscriptionInput) =>
  // A device moves to whoever signed in on it last.
  prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: { userId, ...subscription },
    update: { userId, p256dh: subscription.p256dh, auth: subscription.auth },
  });

export const removeSubscription = (userId: string, endpoint: string) =>
  prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });

// unreadCount covers updates only: open to-dos are counted from the list.
export const listNotifications = async (userId: string) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, body: true, href: true, kind: true, key: true, actionLabel: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId, kind: "UPDATE", readAt: null } }),
  ]);
  return { notifications, unreadCount };
};

export const markNotificationsRead = (userId: string) =>
  prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });

// One update, or every update when id is left out. To-dos can't be dismissed.
export const dismissNotifications = (userId: string, id?: string) =>
  prisma.notification.deleteMany({ where: { userId, kind: "UPDATE", ...(id && { id }) } });

// Push text shows on lock screens, so callers keep it free of personal details.
const sendPush = async (userIds: string[], message: NotificationMessage) => {
  if (!pushConfigured()) return;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const payload = JSON.stringify({
    title: message.title,
    body: message.pushBody ?? message.body,
    href: message.href,
    key: message.key,
    actionLabel: message.actionLabel,
  });
  // A phone that comes online after a to-do expired never shows it.
  const ttl = message.expiresAt
    ? Math.max(0, Math.floor((message.expiresAt.getTime() - Date.now()) / 1000))
    : 24 * 60 * 60;
  const gone: string[] = [];
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
          { TTL: ttl },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // The browser dropped this subscription (app uninstalled, permission removed).
        if (status === 404 || status === 410) gone.push(subscription.id);
        else console.error("Push failed:", status ?? (error as Error).message);
      }
    }),
  );
  if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
};

// Saves the notification for each person, then pushes it to their devices.
// A keyed message reaches each person once: anyone who already has it is skipped.
export const notifyUsers = async (userIds: string[], message: NotificationMessage) => {
  let recipients = [...new Set(userIds)];
  if (message.key && recipients.length > 0) {
    const existing = await prisma.notification.findMany({
      where: { key: message.key, userId: { in: recipients } },
      select: { userId: true },
    });
    const notified = new Set(existing.map((row) => row.userId));
    recipients = recipients.filter((userId) => !notified.has(userId));
  }
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((userId) => {
      const { pushBody: _pushBody, ...stored } = message;
      return { userId, ...stored, href: message.href ?? null };
    }),
  });
  await sendPush(recipients, message);
};

// For events: a failed notification must never fail the action that caused it.
export const notifyUsersInBackground = (userIds: string[], message: NotificationMessage) => {
  void notifyUsers(userIds, message).catch((error) =>
    console.error("Notification failed:", (error as Error).message),
  );
};

type CreatedRole = {
  subRole: SubRole;
  projectId: string | null;
  centerId: string | null;
  semesterId: string | null;
  project?: { name: string } | null;
  center?: { name: string } | null;
  semester?: { name: string } | null;
};

// One role names its place; several just say there are new roles.
export const newRoleMessage = (roles: CreatedRole[]): NotificationMessage | null => {
  if (roles.length === 0) return null;
  if (roles.length > 1) {
    return { title: "You have new roles", body: `${roles.length} new roles. Open the app to see them.`, href: "/projects" };
  }
  const [role] = roles;
  const label = roleLabels[role.subRole];
  if (role.semesterId && role.center && role.semester) {
    return {
      title: `New role at ${role.center.name}`,
      body: `${label} in ${role.semester.name}`,
      href: `/projects/${role.projectId}/centers/${role.centerId}/semesters/${role.semesterId}/dashboard`,
    };
  }
  return { title: "You have a new role", body: role.project ? `${label} in ${role.project.name}` : label, href: "/projects" };
};

export const notifyNewRolesInBackground = (userId: string, roles: CreatedRole[]) => {
  const message = newRoleMessage(roles);
  if (message) notifyUsersInBackground([userId], message);
};

// A sign-up waiting for review: a to-do for every admin until it is approved or
// rejected (clearRegistrationRequest).
export const registrationKey = (userId: string) => `registration:${userId}`;

export const registrationRequestMessage = (applicant: { id: string; name: string }): NotificationMessage => ({
  title: "New registration request",
  body: `${applicant.name} asked to join Prangan Manager.`,
  href: `/users/${applicant.id}/review`,
  actionLabel: "Review request",
  kind: "TASK",
  key: registrationKey(applicant.id),
});

export const clearRegistrationRequestInBackground = (userId: string) => {
  void prisma.notification
    .deleteMany({ where: { key: registrationKey(userId) } })
    .catch((error) => console.error("Clearing notification failed:", (error as Error).message));
};

export const notifyAdminsInBackground = (message: NotificationMessage) => {
  void prisma.user
    .findMany({ where: { role: "ADMIN", status: "APPROVED" }, select: { id: true } })
    .then((admins) => notifyUsers(admins.map((admin) => admin.id), message))
    .catch((error) => console.error("Notification failed:", (error as Error).message));
};
