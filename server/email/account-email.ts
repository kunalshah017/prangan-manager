import { EMAIL_TEMPLATES } from "../constants/email_templates.js";
import type { EnqueueEmailInput } from "../service/email-queue.service.js";
import { escapeHtml } from "./escape-html.js";

export const buildRegistrationApprovalEmailJob = ({
  userId,
  email,
  name,
  activationUrl,
  roleAssignmentDetails,
}: {
  userId: string;
  email: string;
  name: string;
  activationUrl: string;
  roleAssignmentDetails: string;
}): EnqueueEmailInput => ({
  dedupeKey: `registration-approved:${userId}`,
  to: email,
  subject: EMAIL_TEMPLATES.VERIFICATION_SUCCESS.subject,
  html: EMAIL_TEMPLATES.VERIFICATION_SUCCESS.getTemplate({
    name: escapeHtml(name),
    email: escapeHtml(email),
    activationUrl,
    roleAssignmentDetails,
  }),
});

export const buildRegistrationRejectionEmailJob = ({
  userId,
  email,
  name,
  rejectionReason,
}: {
  userId: string;
  email: string;
  name: string;
  rejectionReason: string;
}): EnqueueEmailInput => ({
  dedupeKey: `registration-rejected:${userId}`,
  to: email,
  subject: "Registration Update - Prangan Foundation",
  html: EMAIL_TEMPLATES.VERIFICATION_REJECTED.getTemplate({
    name: escapeHtml(name),
    email: escapeHtml(email),
    rejectionReason: escapeHtml(rejectionReason),
  }),
});

export const buildAccessRestoredEmailJob = ({
  userId,
  email,
  name,
  signInUrl,
  roleAssignmentDetails,
  restoredAt,
}: {
  userId: string;
  email: string;
  name: string;
  signInUrl: string;
  roleAssignmentDetails: string;
  restoredAt: Date;
}): EnqueueEmailInput => ({
  // Access can be restored more than once, so each restore gets its own email.
  dedupeKey: `access-restored:${userId}:${restoredAt.getTime()}`,
  to: email,
  subject: EMAIL_TEMPLATES.VERIFICATION_SUCCESS.restoredSubject,
  html: EMAIL_TEMPLATES.VERIFICATION_SUCCESS.getTemplate({
    name: escapeHtml(name),
    email: escapeHtml(email),
    signInUrl,
    roleAssignmentDetails,
    restored: true,
  }),
});

export const buildPasswordResetEmailJob = ({
  accountTokenId,
  email,
  name,
  resetUrl,
}: {
  accountTokenId: string;
  email: string;
  name: string;
  resetUrl: string;
}): EnqueueEmailInput => ({
  dedupeKey: `password-reset:${accountTokenId}`,
  to: email,
  subject: "Reset your Prangan password",
  html: EMAIL_TEMPLATES.PASSWORD_RESET.getTemplate({
    name: escapeHtml(name),
    resetUrl,
  }),
});
