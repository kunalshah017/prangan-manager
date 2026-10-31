import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { AcademicLevelEditor } from "@/components/levels/AcademicLevelEditor";
import { PageTitle } from "@/components/navigation/PageTitle";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ErrorState, ListPageSkeleton } from "@/components/workspace/PageState";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";
import {
  useAcademicLevels,
  useCreateAcademicLevel,
  useReorderAcademicLevels,
  useUpdateAcademicLevel,
} from "@/hooks/useAcademicLevelQueries";
import { sortByJourneyOrder } from "@/lib/levels";
import type { AcademicLevel } from "@/types/api";

const AcademicLevels = () => {
  const levelsQuery = useAcademicLevels({ includeArchived: true });
  const createMutation = useCreateAcademicLevel();
  const updateMutation = useUpdateAcademicLevel();
  const reorderMutation = useReorderAcademicLevels();
  const [archiveTarget, setArchiveTarget] = useState<AcademicLevel | null>(null);
  const levels = useMemo(
    () => sortByJourneyOrder(levelsQuery.data ?? []),
    [levelsQuery.data],
  );
  const activeLevels = useMemo(
    () => levels.filter((level) => level.isActive),
    [levels],
  );
  const isMutating = createMutation.isPending || updateMutation.isPending || reorderMutation.isPending;

  const updateLevel = async (level: AcademicLevel, data: { name?: string; isActive?: boolean }, successMessage: string) => {
    try {
      await updateMutation.mutateAsync({ id: level.id, data });
      toast.success(successMessage);
      return true;
    } catch {
      toast.error("Unable to update this level. Try again.");
      return false;
    }
  };

  const handleMove = async (level: AcademicLevel, direction: -1 | 1) => {
    if (!level.isActive) return;
    const index = activeLevels.findIndex((candidate) => candidate.id === level.id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= activeLevels.length) return;
    const orderedIds = activeLevels.map((candidate) => candidate.id);
    [orderedIds[index], orderedIds[destination]] = [orderedIds[destination], orderedIds[index]];
    try {
      await reorderMutation.mutateAsync({ orderedIds });
      toast.success("Level order updated.");
    } catch {
      toast.error("Unable to reorder levels. Try again.");
    }
  };

  return (
    <WorkspacePage>
      <PageTitle title="Level catalogue" />

      {levelsQuery.isLoading && <ListPageSkeleton label="Loading academic levels" rows={4} />}

      {levelsQuery.error && (
        <ErrorState
          title="Academic levels could not be loaded"
          description="Check your connection, then try again."
          onRetry={() => void levelsQuery.refetch()}
        />
      )}

      {levelsQuery.isSuccess && (
        <AcademicLevelEditor
          levels={levels}
          isMutating={isMutating}
          onCreate={async (data) => {
            try {
              await createMutation.mutateAsync(data);
              toast.success("Academic level created.");
              return true;
            } catch {
              toast.error("Unable to create this level. Check that its code is unique.");
              return false;
            }
          }}
          onRename={(level, name) => updateLevel(level, { name }, "Level renamed.")}
          onArchiveRequest={setArchiveTarget}
          onRestore={(level) => void updateLevel(level, { isActive: true }, "Level restored.")}
          onMove={(level, direction) => void handleMove(level, direction)}
        />
      )}

      <ConfirmationModal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={async () => {
          if (!archiveTarget) return;
          const archived = await updateLevel(archiveTarget, { isActive: false }, "Level archived.");
          if (archived) setArchiveTarget(null);
        }}
        title="Archive academic level"
        message={`Archive "${archiveTarget?.name ?? "this level"}"? It will remain in existing semesters but cannot be selected for new semesters.`}
        confirmText="Archive level"
        isLoading={updateMutation.isPending}
        loadingMessage="Archiving..."
        variant="warning"
      />
    </WorkspacePage>
  );
};

export default AcademicLevels;