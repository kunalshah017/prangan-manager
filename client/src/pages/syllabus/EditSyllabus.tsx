import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import {
  TopicEditor,
  type TopicEditorSubtopic,
  type TopicEditorTopic,
} from "@/components/syllabus/TopicEditor";
import Modal from "@/components/ui/modal";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import {
  useBulkCreateTopics,
  useDeleteSyllabusTopic,
  useSyllabus,
  useSyllabusTopics,
  useUpdateSyllabus,
  useUpdateSyllabusTopic,
} from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";
import { levelName } from "@/lib/levels";
import type { SyllabusTopic } from "@/types/api";

const toEditorTopics = (items: SyllabusTopic[]): TopicEditorTopic[] =>
  items
    .filter((topic) => !topic.parentId)
    .map((topic) => {
      const subtopics = topic.subtopics?.length
        ? topic.subtopics
        : items.filter((candidate) => candidate.parentId === topic.id);

      return {
        id: `existing-${topic.id}`,
        syllabusTopicId: topic.id,
        serialNumber: topic.serialNumber,
        title: topic.title,
        cycle: topic.cycle,
        isExpanded: false,
        subtopics: subtopics.map((subtopic) => ({
          id: `existing-${subtopic.id}`,
          syllabusTopicId: subtopic.id,
          serialNumber: subtopic.serialNumber,
          title: subtopic.title,
          cycle: subtopic.cycle,
        })),
      };
    });

type RemovalRequest =
  | { type: "topic"; topicId: string; title: string; subtopicCount: number }
  | {
      type: "subtopic";
      topicId: string;
      subtopicId: string;
      title: string;
      subtopicCount: 0;
    };

const EditSyllabus = () => {
  const { projectId, centerId, semesterId, syllabusId } = useParams<{
    projectId: string;
    centerId: string;
    semesterId: string;
    syllabusId: string;
  }>();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const workspace = { projectId, centerId, semesterId };
  const hasEditPermission = can(user, "curriculum.manage", workspace);
  const listPath = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`;

  const syllabusQuery = useSyllabus(syllabusId || "", {
    includeStats: false,
    includeTopics: false,
    enabled: hasEditPermission,
  });
  const topicsQuery = useSyllabusTopics({
    syllabusId: syllabusId || "",
    includeSubtopics: true,
    enabled: hasEditPermission,
  });
  const updateSyllabus = useUpdateSyllabus();
  const updateTopic = useUpdateSyllabusTopic();
  const deleteTopic = useDeleteSyllabusTopic();
  const bulkCreateTopics = useBulkCreateTopics();

  const initializedSyllabusId = useRef<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<TopicEditorTopic[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [removalRequest, setRemovalRequest] =
    useState<RemovalRequest | null>(null);

  useEffect(() => {
    if (
      syllabusQuery.data &&
      topicsQuery.data &&
      initializedSyllabusId.current !== syllabusQuery.data.id
    ) {
      setName(syllabusQuery.data.name);
      setDescription(syllabusQuery.data.description || "");
      setTopics(toEditorTopics(topicsQuery.data));
      initializedSyllabusId.current = syllabusQuery.data.id;
    }
  }, [syllabusQuery.data, topicsQuery.data]);

  const isPending =
    updateSyllabus.isPending ||
    updateTopic.isPending ||
    deleteTopic.isPending ||
    bulkCreateTopics.isPending;

  const requestTopicRemoval = (topic: TopicEditorTopic) =>
    setRemovalRequest({
      type: "topic",
      topicId: topic.id,
      title: topic.title || `Topic ${topic.serialNumber}`,
      subtopicCount: topic.subtopics.filter((subtopic) => !subtopic.isDeleted)
        .length,
    });

  const requestSubtopicRemoval = (
    topic: TopicEditorTopic,
    subtopic: TopicEditorSubtopic,
  ) =>
    setRemovalRequest({
      type: "subtopic",
      topicId: topic.id,
      subtopicId: subtopic.id,
      title: subtopic.title || `Subtopic ${subtopic.serialNumber}`,
      subtopicCount: 0,
    });

  const confirmRemoval = () => {
    if (!removalRequest) return;

    setTopics((current) =>
      current
        .map((topic) => {
          if (topic.id !== removalRequest.topicId) return topic;
          if (removalRequest.type === "topic") {
            return topic.syllabusTopicId
              ? { ...topic, isDeleted: true }
              : null;
          }

          return {
            ...topic,
            subtopics: topic.subtopics
              .map((subtopic) => {
                if (subtopic.id !== removalRequest.subtopicId) return subtopic;
                return subtopic.syllabusTopicId
                  ? { ...subtopic, isDeleted: true }
                  : null;
              })
              .filter(
                (subtopic): subtopic is TopicEditorSubtopic =>
                  subtopic !== null,
              ),
          };
        })
        .filter((topic): topic is TopicEditorTopic => topic !== null),
    );
    setRemovalRequest(null);
  };

  const recoverPersistedTopics = async () => {
    const [nextSyllabus, nextTopics] = await Promise.all([
      syllabusQuery.refetch(),
      topicsQuery.refetch(),
    ]);
    if (nextSyllabus.data) {
      setName(nextSyllabus.data.name);
      setDescription(nextSyllabus.data.description || "");
    }
    if (nextTopics.data) setTopics(toEditorTopics(nextTopics.data));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!syllabusId) {
      setSubmitError("The curriculum ID is missing.");
      return;
    }

    const visibleTopics = topics.filter((topic) => !topic.isDeleted);
    if (
      visibleTopics.some(
        (topic) =>
          !topic.title.trim() ||
          topic.subtopics.some(
            (subtopic) => !subtopic.isDeleted && !subtopic.title.trim(),
          ),
      )
    ) {
      setSubmitError("Add a title for every topic and subtopic before saving.");
      return;
    }

    try {
      await updateSyllabus.mutateAsync({
        id: syllabusId,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });

      const existingUpdates = visibleTopics.flatMap((topic, topicIndex) => {
        const rootUpdate =
          topic.syllabusTopicId && topic.isModified
            ? [
                updateTopic.mutateAsync({
                  id: topic.syllabusTopicId,
                  data: {
                    serialNumber: topic.serialNumber,
                    title: topic.title.trim(),
                    cycle: topic.cycle,
                    orderIndex: topicIndex + 1,
                  },
                }),
              ]
            : [];
        const subtopicUpdates = topic.subtopics
          .filter(
            (subtopic) =>
              !subtopic.isDeleted &&
              subtopic.syllabusTopicId &&
              subtopic.isModified,
          )
          .map((subtopic, subtopicIndex) =>
            updateTopic.mutateAsync({
              id: subtopic.syllabusTopicId!,
              data: {
                serialNumber: subtopic.serialNumber,
                title: subtopic.title.trim(),
                cycle: subtopic.cycle,
                orderIndex: subtopicIndex + 1,
              },
            }),
          );
        return [...rootUpdate, ...subtopicUpdates];
      });
      await Promise.all(existingUpdates);

      const newRoots = visibleTopics.filter((topic) => !topic.syllabusTopicId);
      const createdRoots = newRoots.length
        ? await bulkCreateTopics.mutateAsync({
            syllabusId,
            topics: newRoots.map((topic) => ({
              serialNumber: topic.serialNumber,
              title: topic.title.trim(),
              cycle: topic.cycle,
              orderIndex: visibleTopics.indexOf(topic) + 1,
            })),
          })
        : [];
      const createdRootIds = new Map(
        newRoots.map((topic, index) => [topic.id, createdRoots[index]?.id]),
      );

      const newSubtopics = visibleTopics.flatMap((topic) => {
        const parentId = topic.syllabusTopicId || createdRootIds.get(topic.id);
        if (!parentId) {
          throw new Error("A parent topic ID is missing for a new subtopic.");
        }
        return topic.subtopics
          .filter(
            (subtopic) => !subtopic.isDeleted && !subtopic.syllabusTopicId,
          )
          .map((subtopic, subtopicIndex) => ({
            parentId,
            serialNumber: subtopic.serialNumber,
            title: subtopic.title.trim(),
            cycle: subtopic.cycle,
            orderIndex: subtopicIndex + 1,
          }));
      });
      if (newSubtopics.length > 0) {
        await bulkCreateTopics.mutateAsync({
          syllabusId,
          topics: newSubtopics,
        });
      }

      const deletedIds = topics.flatMap((topic) => {
        if (topic.isDeleted && topic.syllabusTopicId) {
          return [topic.syllabusTopicId];
        }
        if (topic.isDeleted) return [];
        return topic.subtopics
          .filter(
            (subtopic) => subtopic.isDeleted && subtopic.syllabusTopicId,
          )
          .map((subtopic) => subtopic.syllabusTopicId!);
      });
      await Promise.all(deletedIds.map((id) => deleteTopic.mutateAsync(id)));

      toast.success("Curriculum updated successfully");
      navigate(listPath);
    } catch (error) {
      await recoverPersistedTopics();
      setSubmitError(
        error instanceof Error && error.message
          ? `${error.message} The saved curriculum has been reloaded.`
          : "Some changes could not be saved. The persisted curriculum has been reloaded.",
      );
    }
  };

  const isLoading =
    isAuthLoading || syllabusQuery.isLoading || topicsQuery.isLoading;
  if (isLoading) {
    return (
      <WorkspacePage>
        <div className="flex min-h-[55dvh] items-center justify-center" aria-label="Loading curriculum editor">
          <LoadingButterfly size="md" />
        </div>
      </WorkspacePage>
    );
  }

  if (syllabusQuery.isError || topicsQuery.isError) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum could not be loaded"
          description="Check your connection and try loading the curriculum again."
          actionLabel="Try again"
          onAction={() =>
            void Promise.all([syllabusQuery.refetch(), topicsQuery.refetch()])
          }
        />
      </WorkspacePage>
    );
  }

  if (!hasEditPermission) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum editing is unavailable"
          description="Only curriculum mentors and administrators can edit this curriculum."
          actionLabel="Back to curriculum"
          onAction={() => navigate(listPath)}
        />
      </WorkspacePage>
    );
  }

  if (!syllabusQuery.data) {
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

  const syllabus = syllabusQuery.data;

  return (
    <WorkspacePage className="min-w-0 space-y-6">
      <WorkspacePageHeader
        title="Edit curriculum"
        badge={levelName(syllabus.semesterLevel, syllabus.level)}
        description="Update curriculum details and preserve topic progress across all assessment cycles."
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

      <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
        <section aria-labelledby="edit-details-title" className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div>
            <h2 id="edit-details-title" className="text-xl font-semibold text-foreground">
              Curriculum details
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The level is fixed after creation.
            </p>
          </div>
          <div className="grid min-w-0 gap-5 sm:grid-cols-2">
            <FormField label="Level" htmlFor="level-display">
              <span className="sr-only">includeInactiveCurrent</span>
              <output
                id="level-display"
                className="flex min-h-11 items-center rounded-md border border-border bg-muted/50 px-3 text-sm text-foreground"
              >
                {levelName(syllabus.semesterLevel, syllabus.level)}
              </output>
            </FormField>
            <FormField label="Curriculum name" htmlFor="name">
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isPending}
                className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
            </FormField>
          </div>
          <FormField label="Description" htmlFor="description">
            <textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              disabled={isPending}
              className="w-full min-w-0 resize-y rounded-md border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </FormField>
        </section>

        <section className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <TopicEditor
            topics={topics}
            onChange={setTopics}
            disabled={isPending}
            idPrefix="edit-curriculum"
            onRequestRemoveTopic={requestTopicRemoval}
            onRequestRemoveSubtopic={requestSubtopicRemoval}
          />
        </section>

        {submitError && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <div className="sticky bottom-0 z-20 -mx-2 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-2 py-4 backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isPending ? "Saving changes..." : "Save changes"}
          </button>
        </div>
      </form>

      {removalRequest && (
        <Modal
          isOpen
          onClose={() => setRemovalRequest(null)}
          title={`Remove ${removalRequest.type}`}
          className="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-foreground">
              Remove <strong>{removalRequest.title}</strong> when you save these changes?
            </p>
            {removalRequest.type === "topic" && removalRequest.subtopicCount > 0 && (
              <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
                Its {removalRequest.subtopicCount} subtopics and related progress will also be removed.
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRemovalRequest(null)}
                className="min-h-11 rounded-md border border-border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Keep item
              </button>
              <button
                type="button"
                onClick={confirmRemoval}
                className="min-h-11 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                Remove item
              </button>
            </div>
          </div>
        </Modal>
      )}
    </WorkspacePage>
  );
};

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
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
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default EditSyllabus;
