import { useMemo, useState } from "react";
import { Layers, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import { AcademicLevelEditor } from "@/components/levels/AcademicLevelEditor";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { CustomButton } from "@/components/ui/button";
import { WorkspacePage, WorkspacePageHeader } from "@/components/workspace/WorkspacePage";
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
    <WorkspacePage className="space-y-6">
      <WorkspacePageHeader title="Academic levels" description="Manage the reusable level catalog and its learning journey order." badge={levelsQuery.isSuccess ? `${levels.filter((level) => level.isActive).length} active` : undefined} />

      <section className="rounded-lg border border-border bg-muted/40 p-4" aria-label="Archived level behavior">
        <div className="flex gap-3">
          <Layers className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted-foreground">Archived definitions remain in existing semesters, but they are unavailable when selecting levels for new semesters.</p>
        </div>
      </section>

      {levelsQuery.isLoading && <div className="min-h-72 animate-pulse rounded-lg border border-border bg-muted/40 motion-reduce:animate-none" aria-label="Loading academic levels" />}

      {levelsQuery.error && (
        <section className="rounded-lg border border-destructive/30 bg-card p-6 text-center" role="alert">
          <h2 className="text-lg font-semibold text-foreground">Academic levels could not be loaded</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check your connection, then try again.</p>
          <CustomButton type="button" onClick={() => void levelsQuery.refetch()} className="mt-5 min-h-11 gap-2"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</CustomButton>
        </section>
      )}

      {levelsQuery.isSuccess && levels.length === 0 && (
        <section className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-lg font-semibold text-foreground">No academic levels yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create the first level to begin the learning journey.</p>
        </section>
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
          onRename={(level, name) => void updateLevel(level, { name }, "Level renamed.")}
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