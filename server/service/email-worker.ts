import { sendEmail } from "../utils/mail.js";
import {
  claimNextEmailJob,
  completeEmailJob,
  failEmailJob,
  getNextEmailJobWakeAt,
  type ClaimedEmailJob,
} from "./email-queue.service.js";

export type EmailWorkerDependencies = {
  claimNext: () => Promise<ClaimedEmailJob | null>;
  nextWakeAt: () => Promise<Date | null>;
  deliver: (job: ClaimedEmailJob) => Promise<unknown>;
  complete: (job: ClaimedEmailJob) => Promise<unknown>;
  fail: (job: ClaimedEmailJob, error: Error) => Promise<unknown>;
};

const defaultDependencies: EmailWorkerDependencies = {
  claimNext: () => claimNextEmailJob(),
  nextWakeAt: () => getNextEmailJobWakeAt(),
  deliver: (job) =>
    sendEmail(job.to, job.subject, job.html, {
      fromName: job.fromName ?? undefined,
      messageId: job.messageId,
      text: job.text ?? undefined,
    }),
  complete: (job) => completeEmailJob(job),
  fail: (job, error) => failEmailJob(job, error),
};

const asError = (error: unknown) =>
  error instanceof Error ? error : new Error("Unknown email delivery failure");

export const runEmailWorkerOnce = async (
  dependencies: EmailWorkerDependencies = defaultDependencies,
) => {
  const job = await dependencies.claimNext();
  if (!job) return false;

  try {
    await dependencies.deliver(job);
    await dependencies.complete(job);
  } catch (error) {
    await dependencies.fail(job, asError(error));
  }
  return true;
};

export const startEmailWorker = ({
  failureRetryMs = 60_000,
  dependencies = defaultDependencies,
}: {
  failureRetryMs?: number;
  dependencies?: EmailWorkerDependencies;
} = {}) => {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;
  let wakeRequested = false;

  const schedule = (delay: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      running = cycle();
    }, Math.max(0, delay));
    timer.unref();
  };

  const cycle = async () => {
    try {
      while (!stopped) {
        wakeRequested = false;
        while (!stopped && (await runEmailWorkerOnce(dependencies))) {
          // Drain every job that is ready now.
        }
        if (stopped) break;
        if (wakeRequested) continue;

        const nextWakeAt = await dependencies.nextWakeAt();
        if (wakeRequested) continue;
        if (nextWakeAt) {
          schedule(nextWakeAt.getTime() - Date.now());
        }
        break;
      }
    } catch (error) {
      console.error("Email worker cycle failed:", asError(error).message);
      schedule(failureRetryMs);
    } finally {
      running = undefined;
      if (wakeRequested && !stopped && !timer) schedule(0);
    }
  };

  schedule(0);

  return {
    wake: () => {
      if (stopped) return;
      wakeRequested = true;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (!running) schedule(0);
    },
    stop: async () => {
      stopped = true;
      wakeRequested = false;
      if (timer) clearTimeout(timer);
      timer = undefined;
      await running;
    },
  };
};
