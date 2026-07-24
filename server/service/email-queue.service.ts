import { randomUUID } from "node:crypto";
import {
  EmailJobStatus,
  type Prisma,
} from "../generated/prisma/index.js";
import {
  EMAIL_JOB_LEASE_MS,
  EMAIL_JOB_MAX_ATTEMPTS,
  emailMessageId,
  isFinalEmailAttempt,
  retryDelayMs,
} from "../lib/email-queue-policy.js";
import { prisma } from "../lib/prisma.js";

type Database = typeof prisma | Prisma.TransactionClient;

export type EnqueueEmailInput = {
  dedupeKey: string;
  to: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
};

export const enqueueEmail = async (
  input: EnqueueEmailInput,
  database: Database = prisma,
) => {
  const id = randomUUID();
  return database.emailJob.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      id,
      dedupeKey: input.dedupeKey,
      recipient: input.to,
      fromName: input.fromName,
      subject: input.subject,
      html: input.html,
      text: input.text,
      messageId: emailMessageId(id),
      maxAttempts: EMAIL_JOB_MAX_ATTEMPTS,
    },
    update: {},
  });
};

export type ClaimedEmailJob = {
  id: string;
  to: string;
  fromName: string | null;
  subject: string;
  html: string;
  text: string | null;
  messageId: string;
  lockToken: string;
  attempts: number;
  maxAttempts: number;
};

export const claimNextEmailJob = async (
  now = new Date(),
): Promise<ClaimedEmailJob | null> => {
  const staleBefore = new Date(now.getTime() - EMAIL_JOB_LEASE_MS);

  await prisma.emailJob.updateMany({
    where: {
      status: EmailJobStatus.PROCESSING,
      attempts: { gte: EMAIL_JOB_MAX_ATTEMPTS },
      lockedAt: { lte: staleBefore },
    },
    data: {
      status: EmailJobStatus.FAILED,
      lockToken: null,
      lockedAt: null,
      lastError: "Delivery worker stopped during the final attempt.",
    },
  });

  for (let collision = 0; collision < 5; collision += 1) {
    const candidate = await prisma.emailJob.findFirst({
      where: {
        attempts: { lt: EMAIL_JOB_MAX_ATTEMPTS },
        OR: [
          {
            status: EmailJobStatus.PENDING,
            availableAt: { lte: now },
          },
          {
            status: EmailJobStatus.PROCESSING,
            lockedAt: { lte: staleBefore },
          },
        ],
      },
      orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (!candidate) return null;

    const lockToken = randomUUID();
    const claimed = await prisma.emailJob.updateMany({
      where: {
        id: candidate.id,
        attempts: { lt: EMAIL_JOB_MAX_ATTEMPTS },
        OR: [
          {
            status: EmailJobStatus.PENDING,
            availableAt: { lte: now },
          },
          {
            status: EmailJobStatus.PROCESSING,
            lockedAt: { lte: staleBefore },
          },
        ],
      },
      data: {
        status: EmailJobStatus.PROCESSING,
        attempts: { increment: 1 },
        lockedAt: now,
        lockToken,
        lastError: null,
      },
    });
    if (claimed.count !== 1) continue;

    const job = await prisma.emailJob.findUnique({
      where: { id: candidate.id },
    });
    if (!job || job.lockToken !== lockToken) continue;
    return {
      id: job.id,
      to: job.recipient,
      fromName: job.fromName,
      subject: job.subject,
      html: job.html,
      text: job.text,
      messageId: job.messageId,
      lockToken,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
    };
  }
  return null;
};

export const completeEmailJob = async (
  job: Pick<ClaimedEmailJob, "id" | "lockToken">,
  now = new Date(),
) => {
  await prisma.emailJob.updateMany({
    where: {
      id: job.id,
      status: EmailJobStatus.PROCESSING,
      lockToken: job.lockToken,
    },
    data: {
      status: EmailJobStatus.SENT,
      sentAt: now,
      lockedAt: null,
      lockToken: null,
      lastError: null,
    },
  });
};

export const failEmailJob = async (
  job: Pick<
    ClaimedEmailJob,
    "id" | "lockToken" | "attempts" | "maxAttempts"
  >,
  error: Error,
  now = new Date(),
) => {
  const terminal = isFinalEmailAttempt(job.attempts, job.maxAttempts);
  await prisma.emailJob.updateMany({
    where: {
      id: job.id,
      status: EmailJobStatus.PROCESSING,
      lockToken: job.lockToken,
    },
    data: {
      status: terminal ? EmailJobStatus.FAILED : EmailJobStatus.PENDING,
      availableAt: terminal
        ? now
        : new Date(now.getTime() + retryDelayMs(job.attempts)),
      lockedAt: null,
      lockToken: null,
      lastError: error.message.slice(0, 2_000),
    },
  });
};
