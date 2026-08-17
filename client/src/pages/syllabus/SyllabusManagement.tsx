import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Edit3,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import Modal from "@/components/ui/modal";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import {
  useDeleteSyllabus,
  useSyllabi,
  useUpdateSyllabus,
} from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { useSemesterLevels } from "@/hooks/useAcademicLevelQueries";
import { can } from "@/lib/access";
import { levelName } from "@/lib/levels";
import type { Syllabus } from "@/types/api";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const SyllabusManagement = () => {
  const { projectId, centerId, semesterId } = useParams<{
    projectId: string;
    centerId: string;
    semesterId: string;
  }>();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const workspace = { projectId, centerId, semesterId };
  const canReadCurriculum = can(user, "curriculum.read", workspace);
  const hasManagePermission = can(user, "curriculum.manage", workspace);
  const isAdmin = user?.role === "ADMIN";

  const educatorLevel = useMemo(() => {
    if (!user || user.role === "ADMIN") return undefined;
    const assignments = user.roleAssignments?.filter(
      (assignment) =>
        assignment.isActive &&
        assignment.projectId === projectId &&
        assignment.centerId === centerId &&
        assignment.semesterId === semesterId,
    );
    const hasPrivilegedRole = assignments?.some((assignment) =>
      ["CENTER_MANAGER", "CURRICULUM_MENTOR"].includes(assignment.subRole),
    );
    if (hasPrivilegedRole) return undefined;
    return assignments?.find((assignment) => assignment.subRole === "EDUCATOR")
      ?.semesterLevelId;
  }, [user, projectId, centerId, semesterId]);

  const syllabiQuery = useSyllabi({
    projectId,
    centerId,
    semesterId,
    ...(educatorLevel ? { semesterLevelId: educatorLevel } : {}),
    ...(!isAdmin ? { isActive: true } : {}),
    enabled: canReadCurriculum,
  });
  const deleteSyllabus = useDeleteSyllabus();
  const updateSyllabus = useUpdateSyllabus();
  const semesterLevelsQuery = useSemesterLevels(semesterId || "");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [deleteTarget, setDeleteTarget] = useState<Syllabus | null>(null);

  const syllabi = useMemo(() => syllabiQuery.data || [], [syllabiQuery.data]);
  const filteredSyllabi = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return syllabi.filter((syllabus) => {
      if (levelFilter !== "ALL" && syllabus.semesterLevelId !== levelFilter) return false;
      if (statusFilter === "ACTIVE" && !syllabus.isActive) return false;
      if (statusFilter === "INACTIVE" && syllabus.isActive) return false;
      if (
        normalizedSearch &&
        !`${syllabus.name} ${syllabus.description || ""}`
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [syllabi, search, levelFilter, statusFilter]);

  const totals = useMemo(
    () =>
      syllabi.reduce(
        (summary, syllabus) => ({
          curricula: summary.curricula + 1,
          topics: summary.topics + (syllabus.stats?.totalTopics || 0),
          ongoing: summary.ongoing + (syllabus.stats?.ongoingTopics || 0),
          completed:
            summary.completed + (syllabus.stats?.completedTopics || 0),
        }),
        { curricula: 0, topics: 0, ongoing: 0, completed: 0 },
      ),
    [syllabi],
  );

  const createPath = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus/create`;
  const curriculumPath = (id: string, action: "progress" | "edit") =>
    `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus/${id}/${action}`;

  const reactivate = async (syllabus: Syllabus) => {
    try {
      await updateSyllabus.mutateAsync({
        id: syllabus.id,
        data: { isActive: true },
      });
      toast.success(`${syllabus.name} is active again`);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "The curriculum could not be reactivated.",
      );
    }
  };

  const remove = async (hard: boolean) => {
    if (!deleteTarget) return;
    try {
      await deleteSyllabus.mutateAsync({ id: deleteTarget.id, hard });
      toast.success(
        hard ? "Curriculum permanently deleted" : "Curriculum deactivated",
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "The curriculum could not be removed.",
      );
    }
  };

  if (isAuthLoading || syllabiQuery.isLoading) {
    return (
      <WorkspacePage>
        <div className="flex min-h-[55dvh] items-center justify-center" aria-label="Loading curricula">
          <LoadingButterfly size="md" />
        </div>
      </WorkspacePage>
    );
  }

  if (!canReadCurriculum) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum is unavailable"
          description="Your current role does not include access to this curriculum workspace."
        />
      </WorkspacePage>
    );
  }

  if (syllabiQuery.isError) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curricula could not be loaded"
          description="Check your connection and try loading the curriculum workspace again."
          actionLabel="Try again"
          onAction={() => void syllabiQuery.refetch()}
        />
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage className="min-w-0 space-y-6">
      <WorkspacePageHeader
        title="Curriculum tracker"
        badge={educatorLevel ? levelName(semesterLevelsQuery.data?.find((level) => level.id === educatorLevel)) : undefined}
        description={
          educatorLevel
            ? "Review the assigned level curriculum and keep progress current across all assessment cycles."
            : "Manage one complete curriculum per level and track delivery across SA-1, SA-2, and SA-3."
        }
        action={
          hasManagePermission ? (
            <button
              type="button"
              onClick={() => navigate(createPath)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create curriculum
            </button>
          ) : undefined
        }
      />

      <section aria-label="Curriculum overview" className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
        <SummaryStat label="Curricula" value={totals.curricula} />
        <SummaryStat label="Topics" value={totals.topics} />
        <SummaryStat label="Ongoing" value={totals.ongoing} />
        <SummaryStat label="Completed" value={totals.completed} />
      </section>

      <section aria-labelledby="curriculum-filters-title" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="curriculum-filters-title" className="text-lg font-semibold text-foreground">
            Find a curriculum
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredSyllabi.length} shown
          </span>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <label className="relative min-w-0">
            <span className="sr-only">Search curricula</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search curricula"
              className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label>
            <span className="sr-only">Filter by level</span>
            <select
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(event.target.value)
              }
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ALL">All levels</option>
              {(semesterLevelsQuery.data || []).map((level) => (
                <option key={level.id} value={level.id}>{levelName(level)}</option>
              ))}
            </select>
          </label>
          {isAdmin ? (
            <label>
              <span className="sr-only">Filter by active status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          ) : (
            <div className="hidden sm:block" aria-hidden="true" />
          )}
        </div>
      </section>

      {syllabi.length === 0 ? (
        <EmptyState
          title="No curriculum yet"
          description={
            hasManagePermission
              ? "Create the first level curriculum to begin tracking delivery."
              : "No active curriculum is available for your assigned level."
          }
          action={
            hasManagePermission ? (
              <button
                type="button"
                onClick={() => navigate(createPath)}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create curriculum
              </button>
            ) : undefined
          }
        />
      ) : filteredSyllabi.length === 0 ? (
        <EmptyState
          title="No curricula match these filters"
          description="Clear the search or choose a different level or status."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setLevelFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {filteredSyllabi.map((syllabus) => (
            <CurriculumCard
              key={syllabus.id}
              syllabus={syllabus}
              canManage={hasManagePermission}
              isAdmin={isAdmin}
              isPending={deleteSyllabus.isPending || updateSyllabus.isPending}
              onProgress={() => navigate(curriculumPath(syllabus.id, "progress"))}
              onEdit={() => navigate(curriculumPath(syllabus.id, "edit"))}
              onReactivate={() => void reactivate(syllabus)}
              onDelete={() => setDeleteTarget(syllabus)}
            />
          ))}
        </div>
      )}

      {deleteTarget && (
        <Modal
          isOpen
          onClose={() => setDeleteTarget(null)}
          title="Remove curriculum"
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-foreground">
              Choose how to remove <strong>{deleteTarget.name}</strong>.
            </p>
            {deleteTarget.isActive && (
              <button
                type="button"
                disabled={deleteSyllabus.isPending}
                onClick={() => void remove(false)}
                className="flex min-h-11 w-full items-center gap-3 rounded-md border border-border px-4 text-left text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <Archive className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Deactivate and keep all data
              </button>
            )}
            <button
              type="button"
              disabled={deleteSyllabus.isPending}
              onClick={() => void remove(true)}
              className="flex min-h-11 w-full items-center gap-3 rounded-md border border-destructive/30 px-4 text-left text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete permanently with topics and progress
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="min-h-11 w-full rounded-md border border-border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </WorkspacePage>
  );
};

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border px-3 py-4 text-center even:border-l sm:border-l sm:first:border-l-0">
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function CurriculumCard({
  syllabus,
  canManage,
  isAdmin,
  isPending,
  onProgress,
  onEdit,
  onReactivate,
  onDelete,
}: {
  syllabus: Syllabus;
  canManage: boolean;
  isAdmin: boolean;
  isPending: boolean;
  onProgress: () => void;
  onEdit: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const stats = syllabus.stats || {
    totalTopics: 0,
    pendingTopics: 0,
    ongoingTopics: 0,
    completedTopics: 0,
  };
  const completion = stats.totalTopics
    ? Math.round((stats.completedTopics / stats.totalTopics) * 100)
    : 0;

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {levelName(syllabus.semesterLevel)}
            </span>
            {!syllabus.isActive && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                Inactive
              </span>
            )}
          </div>
          <h2 className="mt-3 break-words text-xl font-semibold text-foreground">
            {syllabus.name}
          </h2>
          {syllabus.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {syllabus.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 divide-x divide-border border-y border-border py-3 text-center">
        <CardStat label="Total" value={stats.totalTopics} />
        <CardStat label="Pending" value={stats.pendingTopics} />
        <CardStat label="Ongoing" value={stats.ongoingTopics} />
        <CardStat label="Done" value={stats.completedTopics} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">Completion</span>
          <span className="tabular-nums text-muted-foreground">{completion}%</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${syllabus.name} completion`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completion}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onProgress}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          View progress
        </button>
        {canManage && (
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${syllabus.name}`}
            title="Edit curriculum"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
        )}
        {isAdmin && !syllabus.isActive && (
          <button
            type="button"
            onClick={onReactivate}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Activate
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            aria-label={`Remove ${syllabus.name}`}
            title="Remove curriculum"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 px-1">
      <p className="font-semibold tabular-nums text-foreground">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border px-5 py-12 text-center">
      <BookOpen className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action}
    </div>
  );
}

function StatePanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-[55dvh] items-center justify-center">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-7 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default SyllabusManagement;
