import { useMemo } from "react";
import { useParams } from "react-router-dom";

import type { WorkspaceContext } from "@/lib/access";

export const useWorkspaceContext = (): WorkspaceContext => {
  const { projectId, centerId, semesterId } = useParams<{
    projectId?: string;
    centerId?: string;
    semesterId?: string;
  }>();

  return useMemo(
    () => ({ projectId, centerId, semesterId }),
    [projectId, centerId, semesterId],
  );
};