import { EMAIL_TEMPLATES } from "../constants/email_templates.js";
import type { EnqueueEmailInput } from "../service/email-queue.service.js";

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
    name,
    email,
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
    name,
    email,
    rejectionReason,
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
  html: EMAIL_TEMPLATES.PASSWORD_RESET.getTemplate({ name, resetUrl }),
});
