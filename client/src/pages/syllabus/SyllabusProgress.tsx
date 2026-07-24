import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Search,
  TimerReset,
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
  useSyllabus,
  useSyllabusTopics,
  useUpdateTopicStatus,
} from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { levelName } from "@/lib/levels";
import {
  curriculumAssessmentCycleOptions,
  getAssessmentCycleLabel,
} from "@/lib/assessment-cycle";
import type {
  CurriculumAssessmentCycle,
  SyllabusTopic,
  SyllabusTopicStatus,
} from "@/types/api";

const statusOptions: Array<{
  value: SyllabusTopicStatus;
  label: string;
}> = [
  { value: "PENDING", label: "Pending" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
];

type PendingChange = {
  topic: SyllabusTopic;
  nextStatus: SyllabusTopicStatus;
  subtopics: SyllabusTopic[];
};

const SyllabusProgress = () => {
  const { projectId, centerId, semesterId, syllabusId } = useParams<{
    projectId: string;
    centerId: string;
    semesterId: string;
    syllabusId: string;
  }>();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const workspace = { projectId, centerId, semesterId };
  const canReadCurriculum = can(user, "curriculum.read", workspace);
  const listPath = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`;

  const syllabusQuery = useSyllabus(syllabusId || "", {
    includeStats: true,
    enabled: canReadCurriculum,
  });
  const topicsQuery = useSyllabusTopics({
    syllabusId: syllabusId || "",
    includeSubtopics: true,
    enabled: canReadCurriculum,
  });
  const updateStatus = useUpdateTopicStatus();

  const [selectedCycle, setSelectedCycle] =
    useState<CurriculumAssessmentCycle>("SA_1");
  const [statusFilter, setStatusFilter] = useState<
    SyllabusTopicStatus | "ALL"
  >("ALL");
  const [search, setSearch] = useState("");
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [notes, setNotes] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);

  const syllabus = syllabusQuery.data;
  const canWriteProgress = can(user, "curriculum.progress.write", {
    ...workspace,
    semesterLevelId: syllabus?.semesterLevelId || undefined,
  });

  const allTopics = useMemo(
    () => topicsQuery.data || [],
    [topicsQuery.data],
  );
  const rootTopics = useMemo(
    () => allTopics.filter((topic) => !topic.parentId),
    [allTopics],
  );
  const getSubtopics = useCallback(
    (topic: SyllabusTopic) =>
      topic.subtopics?.length
        ? topic.subtopics
        : allTopics.filter((candidate) => candidate.parentId === topic.id),
    [allTopics],
  );

  const cycleItems = useMemo(
    () =>
      allTopics.filter((topic) => topic.cycle === selectedCycle),
    [allTopics, selectedCycle],
  );
  const cycleSummary = useMemo(
    () => ({
      total: cycleItems.length,
      pending: cycleItems.filter((topic) => topic.status === "PENDING").length,
      ongoing: cycleItems.filter((topic) => topic.status === "ONGOING").length,
      completed: cycleItems.filter((topic) => topic.status === "COMPLETED").length,
    }),
    [cycleItems],
  );
  const cycleCompletion = cycleSummary.total
    ? Math.round((cycleSummary.completed / cycleSummary.total) * 100)
    : 0;

  const filteredRoots = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return rootTopics.filter((topic) => {
      if (topic.cycle !== selectedCycle) return false;
      const subtopics = getSubtopics(topic);
      const matchesStatus =
        statusFilter === "ALL" ||
        topic.status === statusFilter ||
        subtopics.some((subtopic) => subtopic.status === statusFilter);
      const matchesSearch =
        !normalizedSearch ||
        `${topic.serialNumber} ${topic.title}`
          .toLowerCase()
          .includes(normalizedSearch) ||
        subtopics.some((subtopic) =>
          `${subtopic.serialNumber} ${subtopic.title}`
            .toLowerCase()
            .includes(normalizedSearch),
        );
      return matchesStatus && matchesSearch;
    });
  }, [rootTopics, getSubtopics, selectedCycle, statusFilter, search]);

  const requestStatusChange = (
    topic: SyllabusTopic,
    nextStatus: SyllabusTopicStatus,
  ) => {
    if (nextStatus === topic.status) return;
    setPendingChange({ topic, nextStatus, subtopics: getSubtopics(topic) });
    setNotes("");
    setUpdateError(null);
  };

  const deriveParentStatus = (
    parent: SyllabusTopic,
    changedChildId: string,
    nextStatus: SyllabusTopicStatus,
  ) => {
    const childStatuses = getSubtopics(parent).map((subtopic) =>
      subtopic.id === changedChildId ? nextStatus : subtopic.status,
    );
    if (childStatuses.every((status) => status === "COMPLETED")) {
      return "COMPLETED" as const;
    }
    if (childStatuses.every((status) => status === "PENDING")) {
      return "PENDING" as const;
    }
    return "ONGOING" as const;
  };

  const confirmStatusChange = async () => {
    if (!pendingChange) return;
    setUpdateError(null);
    const trimmedNotes = notes.trim() || undefined;
    const { topic, nextStatus, subtopics } = pendingChange;

    try {
      if (subtopics.length > 0) {
        await Promise.all(
          [topic, ...subtopics].map((item) =>
            updateStatus.mutateAsync({
              id: item.id,
              data: { status: nextStatus, notes: trimmedNotes },
            }),
          ),
        );
      } else if (topic.parentId) {
        await updateStatus.mutateAsync({
          id: topic.id,
          data: { status: nextStatus, notes: trimmedNotes },
        });
        const parent = rootTopics.find((candidate) => candidate.id === topic.parentId);
        if (parent) {
          const parentStatus = deriveParentStatus(parent, topic.id, nextStatus);
          if (parent.status !== parentStatus) {
            await updateStatus.mutateAsync({
              id: parent.id,
              data: { status: parentStatus },
            });
          }
        }
      } else {
        await updateStatus.mutateAsync({
          id: topic.id,
          data: { status: nextStatus, notes: trimmedNotes },
        });
      }

      toast.success("Progress updated");
      setPendingChange(null);
      setNotes("");
    } catch (error) {
      setUpdateError(
        error instanceof Error && error.message
          ? error.message
          : "Progress could not be updated. Try again.",
      );
    }
  };

  const toggleExpanded = (topicId: string) =>
    setExpandedTopics((current) => {
      const next = new Set(current);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });

  const isLoading =
    isAuthLoading || syllabusQuery.isLoading || topicsQuery.isLoading;
  if (isLoading) {
    return (
      <WorkspacePage>
        <div className="flex min-h-[55dvh] items-center justify-center" aria-label="Loading curriculum progress">
          <LoadingButterfly size="md" />
        </div>
      </WorkspacePage>
    );
  }

  if (!canReadCurriculum) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum progress is unavailable"
          description="Your current role does not include access to this curriculum."
          actionLabel="Back to curriculum"
          onAction={() => navigate(listPath)}
        />
      </WorkspacePage>
    );
  }

  if (syllabusQuery.isError || topicsQuery.isError) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum progress could not be loaded"
          description="Check your connection and try loading progress again."
          actionLabel="Try again"
          onAction={() =>
            void Promise.all([syllabusQuery.refetch(), topicsQuery.refetch()])
          }
        />
      </WorkspacePage>
    );
  }

  if (!syllabus) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum not found"
          description="This curriculum may have been removed or you may no longer have access."
          actionLabel="Back to curriculum"
          onAction={() => navigate(listPath)}
        />
      </WorkspacePage>
    );
  }

  const overallCompletion = syllabus.stats?.totalTopics
    ? Math.round(
        (syllabus.stats.completedTopics / syllabus.stats.totalTopics) * 100,
      )
    : 0;

  return (
    <WorkspacePage className="min-w-0 space-y-6">
      <WorkspacePageHeader
        title={syllabus.name}
        badge={levelName(syllabus.semesterLevel, syllabus.level)}
        description={
          syllabus.description ||
          "Track curriculum delivery across each summative assessment cycle."
        }
        action={
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to curriculum
          </button>
        }
      />

      <section aria-label="Overall curriculum progress" className="grid gap-4 border-y border-border py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">Overall completion</span>
            <span className="tabular-nums text-muted-foreground">{overallCompletion}%</span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Overall curriculum completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallCompletion}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${overallCompletion}%` }} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {canWriteProgress
            ? "Select a status to update delivery."
            : "Progress is read-only for your current role."}
        </p>
      </section>

      <div
        role="tablist"
        aria-label="Assessment cycle"
        className="grid grid-cols-3 gap-2"
      >
        {curriculumAssessmentCycleOptions.map((option) => {
          const count = allTopics.filter(
            (topic) => topic.cycle === option.value,
          ).length;
          const selected = selectedCycle === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSelectedCycle(option.value)}
              className={`min-h-11 min-w-0 rounded-md border px-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <span className="block truncate">{getAssessmentCycleLabel(option.value)}</span>
              <span className={`text-xs ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {count} items
              </span>
            </button>
          );
        })}
      </div>

      <section aria-label={`${getAssessmentCycleLabel(selectedCycle)} summary`} className="grid grid-cols-2 border-y border-border sm:grid-cols-5">
        <SummaryStat label="Items" value={cycleSummary.total} />
        <SummaryStat label="Pending" value={cycleSummary.pending} />
        <SummaryStat label="Ongoing" value={cycleSummary.ongoing} />
        <SummaryStat label="Completed" value={cycleSummary.completed} />
        <SummaryStat label="Complete" value={`${cycleCompletion}%`} />
      </section>

      <section aria-labelledby="progress-filters-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="progress-filters-title" className="text-lg font-semibold text-foreground">
            {getAssessmentCycleLabel(selectedCycle)} topics
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredRoots.length} shown
          </span>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative min-w-0">
            <span className="sr-only">Search topics</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search topics"
              className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as SyllabusTopicStatus | "ALL",
                )
              }
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ALL">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {cycleSummary.total === 0 ? (
        <EmptyState
          title={`No ${getAssessmentCycleLabel(selectedCycle)} topics yet`}
          description="Topics assigned to this cycle will appear here."
        />
      ) : filteredRoots.length === 0 ? (
        <EmptyState
          title="No topics match these filters"
          description="Clear the search or show all statuses to recover the topic list."
          action={
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <TimerReset className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRoots.map((topic) => {
            const subtopics = getSubtopics(topic).filter(
              (subtopic) => subtopic.cycle === selectedCycle,
            );
            const expanded = expandedTopics.has(topic.id);
            return (
              <article key={topic.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <TopicIdentity topic={topic} />
                  <div className="w-full shrink-0 sm:w-52">
                    <TopicStatusControl
                      topic={topic}
                      disabled={!canWriteProgress || updateStatus.isPending}
                      onChange={(status) => requestStatusChange(topic, status)}
                    />
                  </div>
                </div>

                <RecentProgress topic={topic} />

                {subtopics.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(topic.id)}
                      aria-expanded={expanded}
                      aria-controls={`subtopics-${topic.id}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                      {expanded ? "Hide" : "Show"} {subtopics.length} subtopics
                    </button>

                    {expanded && (
                      <div id={`subtopics-${topic.id}`} className="mt-3 divide-y divide-border border-y border-border">
                        {subtopics.map((subtopic) => (
                          <div key={subtopic.id} className="grid min-w-0 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_13rem] sm:items-start">
                            <div className="min-w-0">
                              <TopicIdentity topic={subtopic} compact />
                              <RecentProgress topic={subtopic} />
                            </div>
                            <TopicStatusControl
                              topic={subtopic}
                              disabled={!canWriteProgress || updateStatus.isPending}
                              onChange={(status) =>
                                requestStatusChange(subtopic, status)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {pendingChange && (
        <Modal
          isOpen
          onClose={() => !updateStatus.isPending && setPendingChange(null)}
          title="Confirm progress update"
          className="max-w-lg"
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-foreground">
              Change <strong>{pendingChange.topic.title}</strong> to{" "}
              <strong>
                {statusOptions.find(
                  (option) => option.value === pendingChange.nextStatus,
                )?.label}
              </strong>
              ?
            </p>
            {pendingChange.subtopics.length > 0 && (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                This will also update {pendingChange.subtopics.length} subtopics to the same status.
              </p>
            )}
            <label className="grid gap-2" htmlFor="progress-notes">
              <span className="text-sm font-medium text-foreground">Notes (optional)</span>
              <textarea
                id="progress-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                disabled={updateStatus.isPending}
                placeholder="Add context for this progress update"
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </label>
            {updateError && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {updateError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingChange(null)}
                disabled={updateStatus.isPending}
                className="min-h-11 rounded-md border border-border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmStatusChange()}
                disabled={updateStatus.isPending}
                className="min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {updateStatus.isPending ? "Updating progress..." : "Update progress"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </WorkspacePage>
  );
};

function TopicStatusControl({
  topic,
  disabled,
  onChange,
}: {
  topic: SyllabusTopic;
  disabled: boolean;
  onChange: (status: SyllabusTopicStatus) => void;
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        Status for {topic.serialNumber}
      </span>
      <select
        value={topic.status}
        onChange={(event) =>
          onChange(event.target.value as SyllabusTopicStatus)
        }
        disabled={disabled}
        aria-label={`Status for ${topic.title}`}
        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TopicIdentity({
  topic,
  compact = false,
}: {
  topic: SyllabusTopic;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="font-mono tabular-nums">{topic.serialNumber}</span>
        <span>{getAssessmentCycleLabel(topic.cycle)}</span>
        <StatusLabel status={topic.status} />
      </div>
      <h3 className={`${compact ? "mt-1 text-sm" : "mt-2 text-lg"} break-words font-semibold leading-6 text-foreground`}>
        {topic.title}
      </h3>
    </div>
  );
}

function StatusLabel({ status }: { status: SyllabusTopicStatus }) {
  const option = statusOptions.find((candidate) => candidate.value === status)!;
  const Icon =
    status === "COMPLETED"
      ? CheckCircle2
      : status === "ONGOING"
        ? TimerReset
        : Clock3;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {option.label}
    </span>
  );
}

function RecentProgress({ topic }: { topic: SyllabusTopic }) {
  const progress = topic.recentProgress?.[0];
  if (!progress) return null;
  return (
    <div className="mt-2 text-xs leading-5 text-muted-foreground">
      <span>Updated by {progress.updatedByUser.name}</span>
      {progress.notes && <span className="block break-words">Note: {progress.notes}</span>}
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="border-border px-2 py-4 text-center even:border-l sm:border-l sm:first:border-l-0">
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
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
      <CheckCircle2 className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
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
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-[55dvh] items-center justify-center">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-7 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default SyllabusProgress;
