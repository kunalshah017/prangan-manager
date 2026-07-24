import {
  AssessmentCycle,
  Level,
  SyllabusTopicStatus,
} from "../generated/prisma/index.js";
import type {
  BulkCreateTopicsRequest,
  CreateSyllabusRequest,
  CreateSyllabusTopicRequest,
  ImportSyllabusFromTemplateRequest,
  ReorderTopicsRequest,
  UpdateSyllabusRequest,
  UpdateSyllabusTopicRequest,
  UpdateTopicStatusRequest,
} from "../types/syllabus.types.js";

type ParseResult<T> = { data: T } | { error: string };
type TopicInput = BulkCreateTopicsRequest["topics"][number];

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === "object" && input !== null && !Array.isArray(input);

const isCanonicalId = (input: unknown): input is string =>
  typeof input === "string" && input.length > 0 && input === input.trim();

const isNonblankString = (input: unknown): input is string =>
  typeof input === "string" && input.trim().length > 0;

const isLevel = (input: unknown): input is Level =>
  typeof input === "string" && Object.values(Level).includes(input as Level);

const isTopicStatus = (input: unknown): input is SyllabusTopicStatus =>
  typeof input === "string" &&
  Object.values(SyllabusTopicStatus).includes(input as SyllabusTopicStatus);

const isCurriculumAssessmentCycle = (
  input: unknown,
): input is TopicInput["cycle"] =>
  input === AssessmentCycle.SA_1 ||
  input === AssessmentCycle.SA_2 ||
  input === AssessmentCycle.SA_3;

const isOrderIndex = (input: unknown): input is number =>
  typeof input === "number" && Number.isInteger(input) && input >= 0;

const parseScope = (
  input: Record<string, unknown>,
): ParseResult<
  Pick<
    CreateSyllabusRequest,
    "projectId" | "centerId" | "semesterId" | "semesterLevelId" | "level"
  >
> => {
  if (
    !isCanonicalId(input.projectId) ||
    !isCanonicalId(input.centerId) ||
    !isCanonicalId(input.semesterId) ||
    (!isCanonicalId(input.semesterLevelId) && !isLevel(input.level))
  ) {
    return {
      error:
        "projectId, centerId, semesterId, and semesterLevelId or level are required",
    };
  }
  return {
    data: {
      projectId: input.projectId,
      centerId: input.centerId,
      semesterId: input.semesterId,
      ...(isCanonicalId(input.semesterLevelId) && {
        semesterLevelId: input.semesterLevelId,
      }),
      ...(isLevel(input.level) && { level: input.level }),
    },
  };
};

const parseTopic = (input: unknown): ParseResult<TopicInput> => {
  if (!isRecord(input)) return { error: "Each topic must be an object" };
  if (
    !isNonblankString(input.serialNumber) ||
    !isNonblankString(input.title) ||
    !isOrderIndex(input.orderIndex)
  ) {
    return {
      error:
        "Each topic requires serialNumber, title, and a nonnegative orderIndex",
    };
  }
  if ("parentId" in input && !isCanonicalId(input.parentId))
    return { error: "parentId must be a canonical ID" };
  if (!isCurriculumAssessmentCycle(input.cycle))
    return { error: "cycle must be SA_1, SA_2, or SA_3" };
  return {
    data: {
      serialNumber: input.serialNumber,
      title: input.title,
      orderIndex: input.orderIndex,
      ...(typeof input.parentId === "string" && { parentId: input.parentId }),
      cycle: input.cycle,
      ...("metadata" in input && {
        metadata: input.metadata as Record<string, any>,
      }),
    },
  };
};

export const parseCreateSyllabusRequest = (
  input: unknown,
): ParseResult<CreateSyllabusRequest> => {
  if (!isRecord(input)) return { error: "Syllabus data is invalid" };
  const scope = parseScope(input);
  if ("error" in scope) return scope;
  if (!isNonblankString(input.name)) return { error: "name is required" };
  if ("description" in input && typeof input.description !== "string")
    return { error: "description must be a string" };
  return {
    data: {
      ...scope.data,
      name: input.name,
      ...(typeof input.description === "string" && {
        description: input.description,
      }),
    },
  };
};

export const parseUpdateSyllabusRequest = (
  input: unknown,
): ParseResult<UpdateSyllabusRequest> => {
  if (!isRecord(input)) return { error: "Syllabus update data is invalid" };
  const allowed = [
    "name",
    "description",
    "isActive",
    "semesterLevelId",
    "level",
  ];
  if (!Object.keys(input).every((key) => allowed.includes(key)))
    return { error: "Unsupported syllabus update field" };
  if (!Object.keys(input).some((key) => allowed.includes(key)))
    return { error: "No supported syllabus fields were provided" };
  if ("name" in input && !isNonblankString(input.name))
    return { error: "name must be a nonblank string" };
  if ("description" in input && typeof input.description !== "string")
    return { error: "description must be a string" };
  if ("isActive" in input && typeof input.isActive !== "boolean")
    return { error: "isActive must be a boolean" };
  if ("semesterLevelId" in input && !isCanonicalId(input.semesterLevelId))
    return { error: "semesterLevelId must be a canonical ID" };
  if ("level" in input && !isLevel(input.level))
    return { error: "Invalid syllabus level" };
  return {
    data: {
      ...(typeof input.name === "string" && { name: input.name }),
      ...(typeof input.description === "string" && {
        description: input.description,
      }),
      ...(typeof input.isActive === "boolean" && { isActive: input.isActive }),
      ...(isCanonicalId(input.semesterLevelId) && {
        semesterLevelId: input.semesterLevelId,
      }),
      ...(isLevel(input.level) && { level: input.level }),
    },
  };
};

export const parseCreateTopicRequest = (
  input: unknown,
): ParseResult<CreateSyllabusTopicRequest> => {
  if (!isRecord(input)) return { error: "Topic data is invalid" };
  if (!isCanonicalId(input.syllabusId))
    return { error: "syllabusId must be a canonical ID" };
  const topic = parseTopic(input);
  return "error" in topic
    ? topic
    : { data: { syllabusId: input.syllabusId, ...topic.data } };
};

export const parseBulkCreateTopicsRequest = (
  input: unknown,
): ParseResult<BulkCreateTopicsRequest> => {
  if (!isRecord(input)) return { error: "Bulk topic data is invalid" };
  if (!isCanonicalId(input.syllabusId))
    return { error: "syllabusId must be a canonical ID" };
  if (!Array.isArray(input.topics) || input.topics.length === 0)
    return { error: "topics must be a non-empty array" };
  const topics: TopicInput[] = [];
  for (const topic of input.topics) {
    const parsed = parseTopic(topic);
    if ("error" in parsed) return parsed;
    topics.push(parsed.data);
  }
  return { data: { syllabusId: input.syllabusId, topics } };
};

export const parseUpdateTopicRequest = (
  input: unknown,
): ParseResult<UpdateSyllabusTopicRequest> => {
  if (!isRecord(input)) return { error: "Topic update data is invalid" };
  const allowed = [
    "serialNumber",
    "title",
    "cycle",
    "status",
    "orderIndex",
    "metadata",
  ];
  if (!Object.keys(input).every((key) => allowed.includes(key)))
    return { error: "Unsupported topic update field" };
  if (!Object.keys(input).some((key) => allowed.includes(key)))
    return { error: "No supported topic fields were provided" };
  if ("cycle" in input && !isCurriculumAssessmentCycle(input.cycle))
    return { error: "cycle must be SA_1, SA_2, or SA_3" };
  if ("serialNumber" in input && !isNonblankString(input.serialNumber))
    return { error: "serialNumber must be a nonblank string" };
  if ("title" in input && !isNonblankString(input.title))
    return { error: "title must be a nonblank string" };
  if ("status" in input && !isTopicStatus(input.status))
    return { error: "Invalid topic status" };
  if ("orderIndex" in input && !isOrderIndex(input.orderIndex))
    return { error: "orderIndex must be a nonnegative integer" };
  return {
    data: {
      ...(typeof input.serialNumber === "string" && {
        serialNumber: input.serialNumber,
      }),
      ...(typeof input.title === "string" && { title: input.title }),
      ...(isCurriculumAssessmentCycle(input.cycle) && { cycle: input.cycle }),
      ...(isTopicStatus(input.status) && { status: input.status }),
      ...(isOrderIndex(input.orderIndex) && { orderIndex: input.orderIndex }),
      ...("metadata" in input && {
        metadata: input.metadata as Record<string, any>,
      }),
    },
  };
};

export const parseUpdateTopicStatusRequest = (
  input: unknown,
): ParseResult<UpdateTopicStatusRequest> => {
  if (!isRecord(input)) return { error: "Topic status data is invalid" };
  if (!isTopicStatus(input.status)) return { error: "Invalid topic status" };
  if ("notes" in input && typeof input.notes !== "string")
    return { error: "notes must be a string" };
  return {
    data: {
      status: input.status,
      ...(typeof input.notes === "string" && { notes: input.notes }),
    },
  };
};

export const parseReorderTopicsRequest = (
  input: unknown,
): ParseResult<ReorderTopicsRequest> => {
  if (
    !isRecord(input) ||
    !Array.isArray(input.topics) ||
    input.topics.length === 0
  )
    return { error: "topics must be a non-empty array" };
  const topics: ReorderTopicsRequest["topics"] = [];
  const ids = new Set<string>();
  for (const topic of input.topics) {
    if (
      !isRecord(topic) ||
      !isCanonicalId(topic.id) ||
      !isOrderIndex(topic.orderIndex)
    )
      return {
        error:
          "Each reorder topic requires a canonical id and nonnegative orderIndex",
      };
    if (ids.has(topic.id)) return { error: "Topic IDs must be unique" };
    ids.add(topic.id);
    topics.push({ id: topic.id, orderIndex: topic.orderIndex });
  }
  return { data: { topics } };
};

export const parseImportTemplateRequest = (
  input: unknown,
): ParseResult<ImportSyllabusFromTemplateRequest> => {
  if (!isRecord(input)) return { error: "Template import data is invalid" };
  const scope = parseScope(input);
  if ("error" in scope) return scope;
  if (!isNonblankString(input.templateName))
    return { error: "templateName is required" };
  if ("syllabusName" in input && typeof input.syllabusName !== "string")
    return { error: "syllabusName must be a string" };
  if ("description" in input && typeof input.description !== "string")
    return { error: "description must be a string" };
  return {
    data: {
      ...scope.data,
      templateName: input.templateName,
      ...(typeof input.syllabusName === "string" && {
        syllabusName: input.syllabusName,
      }),
      ...(typeof input.description === "string" && {
        description: input.description,
      }),
    },
  };
};
