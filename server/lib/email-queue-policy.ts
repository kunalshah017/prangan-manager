export const EMAIL_JOB_MAX_ATTEMPTS = 5;
export const EMAIL_JOB_LEASE_MS = 10 * 60 * 1_000;

const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;

export const emailMessageId = (jobId: string) =>
  `<email-job-${jobId}@manager.pranganfoundation.org>`;

export const retryDelayMs = (attempts: number) =>
  Math.min(
    60_000 * 2 ** Math.max(0, Math.floor(attempts) - 1),
    MAX_RETRY_DELAY_MS,
  );

export const isFinalEmailAttempt = (
  attempts: number,
  maxAttempts = EMAIL_JOB_MAX_ATTEMPTS,
) => attempts >= maxAttempts;

type ClaimableEmailJob = {
  status: string;
  availableAt: Date;
  lockedAt: Date | null;
};

export const isEmailJobClaimable = (
  job: ClaimableEmailJob,
  now = new Date(),
) =>
  (job.status === "PENDING" && job.availableAt <= now) ||
  (job.status === "PROCESSING" &&
    job.lockedAt !== null &&
    job.lockedAt.getTime() <= now.getTime() - EMAIL_JOB_LEASE_MS);
