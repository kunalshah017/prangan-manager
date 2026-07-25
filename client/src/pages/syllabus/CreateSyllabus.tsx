import { useState } from "react";
import { AlertTriangle, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import LoadingButterfly from "@/components/LoadingButterfly";
import { SemesterLevelSelect } from "@/components/levels/SemesterLevelSelect";
import {
  TopicEditor,
  type TopicEditorTopic,
} from "@/components/syllabus/TopicEditor";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace/WorkspacePage";
import {
  useBulkCreateTopics,
  useCreateSyllabus,
  useSemester,
} from "@/hooks";
import { useAuth } from "@/hooks/useAuth";
import { can } from "@/lib/access";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const CreateSyllabus = () => {
  const { projectId, centerId, semesterId } = useParams<{
    projectId: string;
    centerId: string;
    semesterId: string;
  }>();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const workspace = { projectId, centerId, semesterId };
  const hasPermission = can(user, "curriculum.manage", workspace);
  const listPath = `/projects/${projectId}/centers/${centerId}/semesters/${semesterId}/dashboard/syllabus`;

  const semesterQuery = useSemester(semesterId || "");
  const createSyllabus = useCreateSyllabus();
  const bulkCreateTopics = useBulkCreateTopics();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [semesterLevelId, setSemesterLevelId] = useState("");
  const [topics, setTopics] = useState<TopicEditorTopic[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedSyllabusId, setSavedSyllabusId] = useState("");
  const [savedRootIds, setSavedRootIds] = useState<string[]>([]);

  const isPending =
    createSyllabus.isPending || bulkCreateTopics.isPending;
  const isLockedForRetry = savedRootIds.length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!projectId || !centerId || !semesterId || !semesterLevelId) {
      setSubmitError("The curriculum workspace context is incomplete.");
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
      setSubmitError(
        "Some topic or subtopic titles are blank. Add a title for every item before saving.",
      );
      return;
    }

    let syllabusId = savedSyllabusId;
    let rootIds = savedRootIds;

    try {
      if (!syllabusId) {
        const created = await createSyllabus.mutateAsync({
          projectId,
          centerId,
          semesterId,
          semesterLevelId,
          name: name.trim(),
          description: description.trim() || undefined,
        });
        syllabusId = created.id;
        setSavedSyllabusId(created.id);
      }

      if (visibleTopics.length > 0 && rootIds.length === 0) {
        const createdRoots = await bulkCreateTopics.mutateAsync({
          syllabusId,
          topics: visibleTopics.map((topic, index) => ({
            serialNumber: topic.serialNumber,
            title: topic.title.trim(),
            cycle: topic.cycle,
            orderIndex: index + 1,
          })),
        });
        rootIds = createdRoots.map((topic) => topic.id);
        setSavedRootIds(rootIds);
      }

      if (visibleTopics.length > 0 && rootIds.length !== visibleTopics.length) {
        throw new Error("Not all curriculum topic IDs were returned.");
      }

      const subtopics = visibleTopics.flatMap((topic, topicIndex) =>
        topic.subtopics
          .filter((subtopic) => !subtopic.isDeleted)
          .map((subtopic, subtopicIndex) => ({
            parentId: rootIds[topicIndex],
            serialNumber: subtopic.serialNumber,
            title: subtopic.title.trim(),
            cycle: subtopic.cycle,
            orderIndex: subtopicIndex + 1,
          })),
      );

      if (subtopics.length > 0) {
        await bulkCreateTopics.mutateAsync({ syllabusId, topics: subtopics });
      }

      toast.success("Curriculum created successfully");
      navigate(listPath);
    } catch (error) {
      const message = savedSyllabusId || syllabusId
        ? "The curriculum details were saved, but some topics still need to be saved. Try again to continue."
        : getErrorMessage(error, "The curriculum could not be created.");
      setSubmitError(message);
    }
  };

  if (isAuthLoading || semesterQuery.isLoading) {
    return (
      <WorkspacePage>
        <div className="flex min-h-[55dvh] items-center justify-center" aria-label="Loading curriculum form">
          <LoadingButterfly size="md" />
        </div>
      </WorkspacePage>
    );
  }

  if (semesterQuery.isError || !semesterQuery.data) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum form could not be loaded"
          description="Check the semester connection and try again."
          actionLabel="Try again"
          onAction={() => void semesterQuery.refetch()}
        />
      </WorkspacePage>
    );
  }

  if (!hasPermission) {
    return (
      <WorkspacePage>
        <StatePanel
          title="Curriculum editing is unavailable"
          description="You can view curriculum progress, but only curriculum mentors and administrators can create a curriculum."
          actionLabel="Back to curriculum"
          onAction={() => navigate(listPath)}
        />
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage className="min-w-0 space-y-6">
      <WorkspacePageHeader
        title="Create curriculum"
        badge={semesterQuery.data.name}
        description="Create one complete level curriculum across SA-1, SA-2, and SA-3."
      />

      <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
        <section aria-labelledby="curriculum-details-title" className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <div>
            <h2 id="curriculum-details-title" className="text-xl font-semibold text-foreground">
              Curriculum details
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              A level can have one active curriculum for this semester.
            </p>
          </div>

          <div className="grid min-w-0 gap-5 sm:grid-cols-2">
            <FormField label="Level" htmlFor="level">
              <SemesterLevelSelect
                id="level"
                semesterId={semesterId || ""}
                value={semesterLevelId}
                onChange={setSemesterLevelId}
                required
                disabled={isPending || Boolean(savedSyllabusId)}
                label=""
              />
            </FormField>
            <FormField label="Curriculum name" htmlFor="name">
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={isPending || Boolean(savedSyllabusId)}
                placeholder="English curriculum"
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
              disabled={isPending || Boolean(savedSyllabusId)}
              placeholder="What this curriculum covers"
              className="w-full min-w-0 resize-y rounded-md border border-input bg-background px-3 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </FormField>
        </section>

        <section className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
          <TopicEditor
            topics={topics}
            onChange={setTopics}
            disabled={isPending || isLockedForRetry}
            idPrefix="create-curriculum"
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
            {isPending ? "Saving curriculum..." : savedSyllabusId ? "Retry topic save" : "Create curriculum"}
          </button>
        </div>
      </form>
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

export default CreateSyllabus;
