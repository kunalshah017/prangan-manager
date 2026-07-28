export const EMAIL_JOB_COMMITTED = "email-job-committed";

type CommitTriggerListener = () => void;

const listeners = new Map<string, Set<CommitTriggerListener>>();

export const onCommitTrigger = (
  trigger: string,
  listener: CommitTriggerListener,
) => {
  const triggerListeners = listeners.get(trigger) ?? new Set();
  triggerListeners.add(listener);
  listeners.set(trigger, triggerListeners);

  return () => {
    triggerListeners.delete(listener);
    if (triggerListeners.size === 0) listeners.delete(trigger);
  };
};

export const emitCommitTrigger = (trigger: string) => {
  const errors: Error[] = [];
  for (const listener of listeners.get(trigger) ?? []) {
    try {
      listener();
    } catch (error) {
      errors.push(
        error instanceof Error ? error : new Error("Commit trigger failed"),
      );
    }
  }
  return errors;
};
