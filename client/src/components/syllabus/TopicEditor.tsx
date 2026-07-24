import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

import {
  curriculumAssessmentCycleOptions,
  getAssessmentCycleLabel,
} from "@/lib/assessment-cycle";
import type { CurriculumAssessmentCycle } from "@/types/api";

export interface TopicEditorSubtopic {
  id: string;
  syllabusTopicId?: string;
  serialNumber: string;
  title: string;
  cycle: CurriculumAssessmentCycle;
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
}

export interface TopicEditorTopic {
  id: string;
  syllabusTopicId?: string;
  serialNumber: string;
  title: string;
  cycle: CurriculumAssessmentCycle;
  subtopics: TopicEditorSubtopic[];
  isExpanded?: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
  isModified?: boolean;
}

interface TopicEditorProps {
  topics: TopicEditorTopic[];
  onChange: (topics: TopicEditorTopic[]) => void;
  disabled?: boolean;
  idPrefix?: string;
  onRequestRemoveTopic?: (topic: TopicEditorTopic) => void;
  onRequestRemoveSubtopic?: (
    topic: TopicEditorTopic,
    subtopic: TopicEditorSubtopic,
  ) => void;
}

const createId = (prefix: "topic" | "subtopic") =>
  `${prefix}-${crypto.randomUUID()}`;

export function TopicEditor({
  topics,
  onChange,
  disabled = false,
  idPrefix = "curriculum",
  onRequestRemoveTopic,
  onRequestRemoveSubtopic,
}: TopicEditorProps) {
  const commit = (nextTopics: TopicEditorTopic[]) => onChange(nextTopics);

  const addTopic = (cycle: CurriculumAssessmentCycle) => {
    const nextNumber = topics.filter((topic) => !topic.isDeleted).length + 1;
    commit([
      ...topics,
      {
        id: createId("topic"),
        serialNumber: String(nextNumber),
        title: "",
        cycle,
        subtopics: [],
        isExpanded: true,
        isNew: true,
      },
    ]);
  };

  const updateTopic = (
    topicId: string,
    patch: Partial<Omit<TopicEditorTopic, "id" | "subtopics">>,
  ) =>
    commit(
      topics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              ...patch,
              ...(patch.cycle && {
                subtopics: topic.subtopics.map((subtopic) => ({
                  ...subtopic,
                  cycle: patch.cycle!,
                  isModified: subtopic.syllabusTopicId
                    ? true
                    : subtopic.isModified,
                })),
              }),
              isModified: topic.syllabusTopicId ? true : topic.isModified,
            }
          : topic,
      ),
    );

  const removeTopic = (topic: TopicEditorTopic) => {
    if (onRequestRemoveTopic) {
      onRequestRemoveTopic(topic);
      return;
    }

    commit(
      topics
        .filter((candidate) => candidate.id !== topic.id)
        .map((candidate, topicIndex) => ({
          ...candidate,
          serialNumber: String(topicIndex + 1),
          subtopics: candidate.subtopics.map((subtopic, subtopicIndex) => ({
            ...subtopic,
            serialNumber: `${topicIndex + 1}.${subtopicIndex + 1}`,
          })),
        })),
    );
  };

  const addSubtopic = (topicId: string) =>
    commit(
      topics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              isExpanded: true,
              subtopics: [
                ...topic.subtopics,
                {
                  id: createId("subtopic"),
                  serialNumber: `${topic.serialNumber}.${topic.subtopics.filter((subtopic) => !subtopic.isDeleted).length + 1}`,
                  title: "",
                  cycle: topic.cycle,
                  isNew: true,
                },
              ],
            }
          : topic,
      ),
    );

  const updateSubtopic = (
    topicId: string,
    subtopicId: string,
    patch: Partial<Omit<TopicEditorSubtopic, "id">>,
  ) =>
    commit(
      topics.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              subtopics: topic.subtopics.map((subtopic) =>
                subtopic.id === subtopicId
                  ? {
                      ...subtopic,
                      ...patch,
                      isModified: subtopic.syllabusTopicId
                        ? true
                        : subtopic.isModified,
                    }
                  : subtopic,
              ),
            }
          : topic,
      ),
    );

  const removeSubtopic = (
    topic: TopicEditorTopic,
    subtopic: TopicEditorSubtopic,
  ) => {
    if (onRequestRemoveSubtopic) {
      onRequestRemoveSubtopic(topic, subtopic);
      return;
    }

    commit(
      topics.map((candidate) =>
        candidate.id === topic.id
          ? {
              ...candidate,
              subtopics: candidate.subtopics
                .filter((item) => item.id !== subtopic.id)
                .map((item, index) => ({
                  ...item,
                  serialNumber: `${candidate.serialNumber}.${index + 1}`,
                })),
            }
          : candidate,
      ),
    );
  };

  return (
    <section className="space-y-5" aria-labelledby={`${idPrefix}-topics-title`}>
      <div>
        <h2
          id={`${idPrefix}-topics-title`}
          className="text-xl font-semibold text-foreground"
        >
          Topics and subtopics
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Build the curriculum inside its SA-1, SA-2, and SA-3 sections.
        </p>
      </div>

      {curriculumAssessmentCycleOptions.map((option) => {
        const cycleTopics = topics.filter(
          (topic) => !topic.isDeleted && topic.cycle === option.value,
        );
        const cycleTitleId = `${idPrefix}-${option.value}-title`;

        return (
          <section
            key={option.value}
            aria-labelledby={cycleTitleId}
            className="space-y-3 border-t border-border pt-5 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 id={cycleTitleId} className="font-semibold text-foreground">
                  {getAssessmentCycleLabel(option.value)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {cycleTopics.length} {cycleTopics.length === 1 ? "topic" : "topics"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => addTopic(option.value)}
                disabled={disabled}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add {option.label} topic
              </button>
            </div>

            {cycleTopics.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
                No {option.label} topics added yet.
              </div>
            ) : (
              <div className="space-y-3">
                {cycleTopics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    idPrefix={idPrefix}
                    disabled={disabled}
                    onUpdate={(patch) => updateTopic(topic.id, patch)}
                    onRemove={() => removeTopic(topic)}
                    onAddSubtopic={() => addSubtopic(topic.id)}
                    onUpdateSubtopic={(subtopicId, patch) =>
                      updateSubtopic(topic.id, subtopicId, patch)
                    }
                    onRemoveSubtopic={(subtopic) =>
                      removeSubtopic(topic, subtopic)
                    }
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}

function TopicCard({
  topic,
  idPrefix,
  disabled,
  onUpdate,
  onRemove,
  onAddSubtopic,
  onUpdateSubtopic,
  onRemoveSubtopic,
}: {
  topic: TopicEditorTopic;
  idPrefix: string;
  disabled: boolean;
  onUpdate: (
    patch: Partial<Omit<TopicEditorTopic, "id" | "subtopics">>,
  ) => void;
  onRemove: () => void;
  onAddSubtopic: () => void;
  onUpdateSubtopic: (
    subtopicId: string,
    patch: Partial<Omit<TopicEditorSubtopic, "id">>,
  ) => void;
  onRemoveSubtopic: (subtopic: TopicEditorSubtopic) => void;
}) {
  const expanded = topic.isExpanded ?? true;
  const subtopicsId = `${idPrefix}-${topic.id}-subtopics`;
  const visibleSubtopics = topic.subtopics.filter(
    (subtopic) => !subtopic.isDeleted,
  );

  return (
    <article className="overflow-hidden rounded-md border border-border bg-card p-4 shadow-sm">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_9rem_auto] sm:items-end">
        <EditorField label="Number" htmlFor={`${idPrefix}-${topic.id}-number`}>
          <EditorInput
            id={`${idPrefix}-${topic.id}-number`}
            value={topic.serialNumber}
            disabled={disabled}
            onChange={(value) => onUpdate({ serialNumber: value })}
          />
        </EditorField>
        <EditorField label="Topic" htmlFor={`${idPrefix}-${topic.id}-title`}>
          <EditorInput
            id={`${idPrefix}-${topic.id}-title`}
            value={topic.title}
            disabled={disabled}
            onChange={(value) => onUpdate({ title: value })}
          />
        </EditorField>
        <CycleField
          id={`${idPrefix}-${topic.id}-cycle`}
          value={topic.cycle}
          disabled={disabled}
          onChange={(cycle) => onUpdate({ cycle })}
        />
        <div className="flex gap-1">
          <IconButton
            label={`${expanded ? "Collapse" : "Expand"} topic ${topic.serialNumber}`}
            title={expanded ? "Collapse topic" : "Expand topic"}
            disabled={disabled}
            ariaExpanded={expanded}
            ariaControls={subtopicsId}
            onClick={() => onUpdate({ isExpanded: !expanded })}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            label={`Remove topic ${topic.serialNumber}`}
            title="Remove topic"
            disabled={disabled}
            destructive
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {expanded && (
        <div id={subtopicsId} className="mt-4 border-t border-border pt-4">
          <div className="space-y-3">
            {visibleSubtopics.map((subtopic) => (
              <SubtopicRow
                key={subtopic.id}
                idPrefix={idPrefix}
                topic={topic}
                subtopic={subtopic}
                disabled={disabled}
                onUpdate={(patch) => onUpdateSubtopic(subtopic.id, patch)}
                onRemove={() => onRemoveSubtopic(subtopic)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onAddSubtopic}
            disabled={disabled}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add subtopic
          </button>
        </div>
      )}
    </article>
  );
}

function SubtopicRow({
  idPrefix,
  topic,
  subtopic,
  disabled,
  onUpdate,
  onRemove,
}: {
  idPrefix: string;
  topic: TopicEditorTopic;
  subtopic: TopicEditorSubtopic;
  disabled: boolean;
  onUpdate: (patch: Partial<Omit<TopicEditorSubtopic, "id">>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid min-w-0 gap-3 rounded-md bg-muted/35 p-3 sm:grid-cols-[5.5rem_minmax(0,1fr)_9rem_auto] sm:items-end">
      <EditorField label="Number" htmlFor={`${idPrefix}-${subtopic.id}-number`}>
        <EditorInput
          id={`${idPrefix}-${subtopic.id}-number`}
          value={subtopic.serialNumber}
          disabled={disabled}
          onChange={(value) => onUpdate({ serialNumber: value })}
        />
      </EditorField>
      <EditorField label="Subtopic" htmlFor={`${idPrefix}-${subtopic.id}-title`}>
        <EditorInput
          id={`${idPrefix}-${subtopic.id}-title`}
          value={subtopic.title}
          disabled={disabled}
          onChange={(value) => onUpdate({ title: value })}
        />
      </EditorField>
      <EditorField label="Cycle" htmlFor={`${idPrefix}-${subtopic.id}-cycle`}>
        <div
          id={`${idPrefix}-${subtopic.id}-cycle`}
          className="flex min-h-11 items-center rounded-md border border-border bg-muted px-3 text-sm font-medium text-muted-foreground"
        >
          {getAssessmentCycleLabel(topic.cycle)}
        </div>
      </EditorField>
      <IconButton
        label={`Remove subtopic ${subtopic.serialNumber} from topic ${topic.serialNumber}`}
        title="Remove subtopic"
        disabled={disabled}
        destructive
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

function EditorInput({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      required
      className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    />
  );
}

function CycleField({
  id,
  value,
  disabled,
  onChange,
}: {
  id: string;
  value: CurriculumAssessmentCycle;
  disabled: boolean;
  onChange: (cycle: CurriculumAssessmentCycle) => void;
}) {
  return (
    <EditorField label="Cycle" htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(event) =>
          onChange(event.target.value as CurriculumAssessmentCycle)
        }
        disabled={disabled}
        required
        className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {curriculumAssessmentCycleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </EditorField>
  );
}

function IconButton({
  label,
  title,
  disabled,
  destructive = false,
  ariaExpanded,
  ariaControls,
  onClick,
  children,
}: {
  label: string;
  title: string;
  disabled: boolean;
  destructive?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      title={title}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${
        destructive
          ? "text-destructive hover:bg-destructive/10 focus-visible:ring-destructive"
          : "text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring"
      }`}
    >
      {children}
    </button>
  );
}

function EditorField({
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
