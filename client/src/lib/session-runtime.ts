import { advanceSessionGeneration, clearClientSession } from "./session";
import { queryClient } from "./query-client";
import { clearCsrfToken } from "./csrf";

export const clearBrowserSession = (): void => {
  advanceSessionGeneration();
  clearCsrfToken();
  clearClientSession({ storage: localStorage, queryCache: queryClient });
};
