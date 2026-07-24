import { sendEmail } from "../utils/mail.js";
import {
  claimNextEmailJob,
  completeEmailJob,
  failEmailJob,
  type ClaimedEmailJob,
} from "./email-queue.service.js";

type EmailWorkerDependencies = {
  claimNext: () => Promise<ClaimedEmailJob | null>;
  deliver: (job: ClaimedEmailJob) => Promise<unknown>;
  complete: (job: ClaimedEmailJob) => Promise<unknown>;
  fail: (job: ClaimedEmailJob, error: Error) => Promise<unknown>;
};

const defaultDependencies: EmailWorkerDependencies = {
  claimNext: () => claimNextEmailJob(),
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
  pollIntervalMs = 5_000,
  dependencies = defaultDependencies,
}: {
  pollIntervalMs?: number;
  dependencies?: EmailWorkerDependencies;
} = {}) => {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> | undefined;

  const schedule = (delay: number) => {
    if (stopped) return;
    timer = setTimeout(() => {
      running = cycle();
    }, delay);
    timer.unref();
  };

  const cycle = async () => {
    let worked = false;
    try {
      worked = await runEmailWorkerOnce(dependencies);
    } catch (error) {
      console.error("Email worker cycle failed:", asError(error).message);
    } finally {
      running = undefined;
      schedule(worked ? 0 : pollIntervalMs);
    }
  };

  schedule(0);

  return {
    stop: async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      await running;
    },
  };
};
