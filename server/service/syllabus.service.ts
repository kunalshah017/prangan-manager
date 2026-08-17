import { SyllabusTopicStatus } from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import {
  CreateSyllabusRequest,
  UpdateSyllabusRequest,
  GetSyllabusRequest,
  SyllabusResponse,
  CreateSyllabusTopicRequest,
  UpdateSyllabusTopicRequest,
  BulkCreateTopicsRequest,
  UpdateTopicStatusRequest,
  ReorderTopicsRequest,
  GetSyllabusTopicsRequest,
  SyllabusTopicResponse,
  GetProgressLogsRequest,
  ProgressLogResponse,
  ImportSyllabusFromTemplateRequest,
  SyllabusStatisticsRequest,
  SyllabusStatisticsResponse,
} from "../types/syllabus.types.js";
import { resolveSemesterLevelInput } from "./semester-level.service.js";

// ============================================
// SYLLABUS CRUD OPERATIONS
// ============================================

/**
 * Create a new syllabus
 */
export const createSyllabus = async (
  data: CreateSyllabusRequest,
): Promise<SyllabusResponse> => {
  const { projectId, centerId, semesterId, name, description } = data;
  const semesterLevel = await resolveSemesterLevelInput(data);

  // Check if syllabus with same context already exists
  const existing = await prisma.syllabus.findFirst({
    where: {
      projectId,
      centerId,
      semesterId,
      semesterLevelId: semesterLevel.id,
      name,
    },
  });

  if (existing) {
    throw new Error(
      `Syllabus with name "${name}" already exists for this context`,
    );
  }

  const syllabus = await prisma.syllabus.create({
    data: {
      projectId,
      centerId,
      semesterId,
      semesterLevelId: semesterLevel.id,
      name,
      description,
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
    },
  });

  return syllabus as SyllabusResponse;
};

/**
 * Get syllabus by ID with optional topic details
 */
export const getSyllabusById = async (
  id: string,
  includeTopics = false,
  includeStats = false,
): Promise<SyllabusResponse | null> => {
  const syllabus = await prisma.syllabus.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
      topics: includeTopics
        ? {
            orderBy: { orderIndex: "asc" },
            include: {
              subtopics: {
                orderBy: { orderIndex: "asc" },
              },
            },
          }
        : false,
    },
  });

  if (!syllabus) {
    return null;
  }

  const result: any = { ...syllabus };

  // Calculate stats if requested
  if (includeStats) {
    const stats = await prisma.syllabusTopic.groupBy({
      by: ["status"],
      where: { syllabusId: id },
      _count: true,
    });

    result.stats = {
      totalTopics: stats.reduce((sum, s) => sum + s._count, 0),
      pendingTopics: stats.find((s) => s.status === "PENDING")?._count || 0,
      ongoingTopics: stats.find((s) => s.status === "ONGOING")?._count || 0,
      completedTopics: stats.find((s) => s.status === "COMPLETED")?._count || 0,
    };
  }

  return result as SyllabusResponse;
};

/**
 * Get all syllabi with filtering
 */
export const getSyllabi = async (
  filters: GetSyllabusRequest,
): Promise<SyllabusResponse[]> => {
  const { projectId, centerId, semesterId, semesterLevelId, isActive } = filters;

  const syllabi = await prisma.syllabus.findMany({
    where: {
      ...(projectId && { projectId }),
      ...(centerId && { centerId }),
      ...(semesterId && { semesterId }),
      ...(semesterLevelId && { semesterLevelId }),
      ...(isActive !== undefined && { isActive }),
      semesterLevel: { isActive: true },
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
      _count: {
        select: { topics: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Add stats for each syllabus
  const syllabusWithStats = await Promise.all(
    syllabi.map(async (syllabus) => {
      const stats = await prisma.syllabusTopic.groupBy({
        by: ["status"],
        where: { syllabusId: syllabus.id },
        _count: true,
      });

      return {
        ...syllabus,
        stats: {
          totalTopics: stats.reduce((sum, s) => sum + s._count, 0),
          pendingTopics: stats.find((s) => s.status === "PENDING")?._count || 0,
          ongoingTopics: stats.find((s) => s.status === "ONGOING")?._count || 0,
          completedTopics:
            stats.find((s) => s.status === "COMPLETED")?._count || 0,
        },
      };
    }),
  );

  return syllabusWithStats as SyllabusResponse[];
};

/**
 * Update a syllabus
 */
export const updateSyllabus = async (
  id: string,
  data: UpdateSyllabusRequest,
): Promise<SyllabusResponse> => {
  const current = await prisma.syllabus.findUnique({ where: { id } });
  if (!current) throw new Error("Syllabus not found");
  const semesterLevel =
    data.semesterLevelId
      ? await resolveSemesterLevelInput({
          semesterId: current.semesterId,
          semesterLevelId: data.semesterLevelId,
        })
      : null;
  const syllabus = await prisma.syllabus.update({
    where: { id },
    data: {
      ...data,
      ...(semesterLevel && {
        semesterLevelId: semesterLevel.id,
      }),
    },
    include: {
      project: {
        select: { id: true, name: true },
      },
      center: {
        select: { id: true, name: true },
      },
      semester: {
        select: { id: true, name: true },
      },
      semesterLevel: { include: { academicLevel: true } },
    },
  });

  return syllabus as SyllabusResponse;
};

/**
 * Delete a syllabus (soft delete by setting isActive to false)
 */
export const deleteSyllabus = async (id: string): Promise<void> => {
  await prisma.syllabus.update({
    where: { id },
    data: { isActive: false },
  });
};

/**
 * Hard delete a syllabus (permanent deletion)
 */
export const hardDeleteSyllabus = async (id: string): Promise<void> => {
  await prisma.syllabus.delete({
    where: { id },
  });
};

const verifySyllabusScope = async <
  T extends {
    semesterId: string;
    semesterLevelId: string;
  },
>(
  scope: T | null,
): Promise<(T & { semesterLevelId: string }) | null> => {
  if (!scope) return null;
  const semesterLevel = await resolveSemesterLevelInput(scope);
  return { ...scope, semesterLevelId: semesterLevel.id };
};

export const getSyllabusScope = async (id: string) => {
  const scope = await prisma.syllabus.findUnique({
    where: { id },
    select: {
      projectId: true,
      centerId: true,
      semesterId: true,
      semesterLevelId: true,
    },
  });
  return verifySyllabusScope(scope);
};

export const getTopicScope = async (id: string) => {
  const topic = await prisma.syllabusTopic.findUnique({
    where: { id },
    select: {
      syllabus: {
        select: {
          projectId: true,
          centerId: true,
          semesterId: true,
          semesterLevelId: true,
        },
      },
    },
  });

  return verifySyllabusScope(topic?.syllabus ?? null);
};

export const getTopicSyllabusId = async (id: string) => {
  const topic = await prisma.syllabusTopic.findUnique({
    where: { id },
    select: { syllabusId: true },
  });

  return topic?.syllabusId ?? null;
};

export const getReorderSyllabusScope = async (topicIds: string[]) => {
  if (new Set(topicIds).size !== topicIds.length) return null;

  const topics = await prisma.syllabusTopic.findMany({
    where: { id: { in: topicIds } },
    select: {
      id: true,
      syllabusId: true,
      syllabus: {
        select: {
          projectId: true,
          centerId: true,
          semesterId: true,
          semesterLevelId: true,
        },
      },
    },
  });
  if (topics.length !== topicIds.length || topics.length === 0) return null;

  const scope = topics[0].syllabus;
  return topics.every(
    (topic) =>
      topic.syllabusId === topics[0].syllabusId &&
      topic.syllabus.projectId === scope.projectId &&
      topic.syllabus.centerId === scope.centerId &&
      topic.syllabus.semesterId === scope.semesterId &&
      topic.syllabus.semesterLevelId === scope.semesterLevelId,
  )
    ? verifySyllabusScope(scope)
    : null;
};

// ============================================
// SYLLABUS TOPIC CRUD OPERATIONS
// ============================================

/**
 * Create a new topic
 */
export const createSyllabusTopic = async (
  data: CreateSyllabusTopicRequest,
): Promise<SyllabusTopicResponse> => {
  const {
    syllabusId,
    parentId,
    serialNumber,
    title,
    cycle,
    orderIndex,
    metadata,
  } = data;

  const syllabus = await getSyllabusScope(syllabusId);
  if (!syllabus) {
    throw new Error("Syllabus not found");
  }

  if (parentId !== undefined) {
    const parent = await prisma.syllabusTopic.findUnique({
      where: { id: parentId },
      select: { id: true, syllabusId: true },
    });

    if (!parent || parent.syllabusId !== syllabusId) {
      throw new Error("Parent topic must belong to the same syllabus");
    }
  }

  const topic = await prisma.syllabusTopic.create({
    data: {
      syllabusId,
      parentId,
      serialNumber,
      title,
      cycle,
      orderIndex,
      metadata,
      status: "PENDING",
    },
    include: {
      parent: {
        select: { id: true, title: true, serialNumber: true },
      },
    },
  });

  return topic as SyllabusTopicResponse;
};

/**
 * Bulk create topics
 */
export const bulkCreateTopics = async (
  data: BulkCreateTopicsRequest,
): Promise<SyllabusTopicResponse[]> => {
  const { syllabusId, topics } = data;

  const syllabus = await getSyllabusScope(syllabusId);
  if (!syllabus) {
    throw new Error("Syllabus not found");
  }

  const parentIds = [
    ...new Set(
      topics
        .map((topic) => topic.parentId)
        .filter((parentId): parentId is string => parentId !== undefined),
    ),
  ];

  if (parentIds.length > 0) {
    const parents = await prisma.syllabusTopic.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, syllabusId: true },
    });
    const parentsById = new Map(parents.map((parent) => [parent.id, parent]));

    if (
      parentIds.some(
        (parentId) => parentsById.get(parentId)?.syllabusId !== syllabusId,
      )
    ) {
      throw new Error("Parent topic must belong to the same syllabus");
    }
  }

  // Create all topics in a transaction
  const createdTopics = await prisma.$transaction(
    topics.map((topic) =>
      prisma.syllabusTopic.create({
        data: {
          syllabusId,
          parentId: topic.parentId,
          serialNumber: topic.serialNumber,
          title: topic.title,
          cycle: topic.cycle,
          orderIndex: topic.orderIndex,
          metadata: topic.metadata,
          status: "PENDING",
        },
        include: {
          parent: {
            select: { id: true, title: true, serialNumber: true },
          },
        },
      }),
    ),
  );

  return createdTopics as SyllabusTopicResponse[];
};

/**
 * Get topic by ID
 */
export const getTopicById = async (
  id: string,
  includeSubtopics = false,
): Promise<SyllabusTopicResponse | null> => {
  const topic = await prisma.syllabusTopic.findUnique({
    where: { id },
    include: {
      parent: {
        select: { id: true, title: true, serialNumber: true },
      },
      subtopics: includeSubtopics
        ? {
            orderBy: { orderIndex: "asc" },
          }
        : false,
      progressLogs: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!topic) {
    return null;
  }

  return {
    ...topic,
    recentProgress: topic.progressLogs.map((log: any) => ({
      id: log.id,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      updatedBy: log.updatedBy,
      updatedByUser: log.user,
      notes: log.notes,
      createdAt: log.createdAt,
    })),
  } as SyllabusTopicResponse;
};

/**
 * Get topics with filtering
 */
export const getTopics = async (
  filters: GetSyllabusTopicsRequest,
): Promise<SyllabusTopicResponse[]> => {
  const { syllabusId, parentId, cycle, status, includeSubtopics } = filters;

  const topics = await prisma.syllabusTopic.findMany({
    where: {
      ...(syllabusId && { syllabusId }),
      ...(parentId !== undefined && {
        parentId: parentId === "" ? null : parentId,
      }),
      ...(cycle && { cycle }),
      ...(status && { status }),
    },
    include: {
      parent: {
        select: { id: true, title: true, serialNumber: true },
      },
      subtopics: includeSubtopics
        ? {
            orderBy: { orderIndex: "asc" },
            include: {
              progressLogs: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                  user: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          }
        : false,
      progressLogs: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
  });

  // Transform progressLogs to recentProgress with updatedByUser
  const transformedTopics = topics.map((topic) => {
    const { progressLogs, subtopics, ...rest } = topic as any;
    return {
      ...rest,
      recentProgress: progressLogs?.map((log: any) => ({
        ...log,
        updatedByUser: log.user,
      })),
      subtopics: subtopics?.map((subtopic: any) => ({
        ...subtopic,
        recentProgress: subtopic.progressLogs?.map((log: any) => ({
          ...log,
          updatedByUser: log.user,
        })),
      })),
    };
  });

  return transformedTopics as SyllabusTopicResponse[];
};

/**
 * Update a topic
 */
export const updateTopic = async (
  id: string,
  data: UpdateSyllabusTopicRequest,
): Promise<SyllabusTopicResponse> => {
  const topic = await prisma.syllabusTopic.update({
    where: { id },
    data,
    include: {
      parent: {
        select: { id: true, title: true, serialNumber: true },
      },
    },
  });

  return topic as SyllabusTopicResponse;
};

/**
 * Update topic status with progress log
 */
export const updateTopicStatus = async (
  topicId: string,
  data: UpdateTopicStatusRequest,
  userId: string,
): Promise<SyllabusTopicResponse> => {
  const { status, notes } = data;

  // Get current topic to capture previous status
  const currentTopic = await prisma.syllabusTopic.findUnique({
    where: { id: topicId },
  });

  if (!currentTopic) {
    throw new Error("Topic not found");
  }

  // Update topic and create progress log in a transaction
  const [updatedTopic] = await prisma.$transaction([
    prisma.syllabusTopic.update({
      where: { id: topicId },
      data: { status },
      include: {
        parent: {
          select: { id: true, title: true, serialNumber: true },
        },
      },
    }),
    prisma.syllabusProgressLog.create({
      data: {
        topicId,
        previousStatus: currentTopic.status,
        newStatus: status,
        updatedBy: userId,
        notes,
      },
    }),
  ]);

  return updatedTopic as SyllabusTopicResponse;
};

/**
 * Reorder topics
 */
export const reorderTopics = async (
  data: ReorderTopicsRequest,
): Promise<void> => {
  const { topics } = data;

  const topicIds = topics.map((topic) => topic.id);
  if (new Set(topicIds).size !== topicIds.length) {
    throw new Error("Topics must belong to one syllabus");
  }

  const persistedTopics = await prisma.syllabusTopic.findMany({
    where: { id: { in: topicIds } },
    select: { id: true, syllabusId: true },
  });
  const syllabusIds = new Set(persistedTopics.map((topic) => topic.syllabusId));

  if (persistedTopics.length !== topicIds.length || syllabusIds.size > 1) {
    throw new Error("Topics must belong to one syllabus");
  }

  // Update all topics in a transaction
  await prisma.$transaction(
    topics.map((topic) =>
      prisma.syllabusTopic.update({
        where: { id: topic.id },
        data: { orderIndex: topic.orderIndex },
      }),
    ),
  );
};

/**
 * Delete a topic
 */
export const deleteTopic = async (id: string): Promise<void> => {
  await prisma.syllabusTopic.delete({
    where: { id },
  });
};

// ============================================
// PROGRESS LOG OPERATIONS
// ============================================

const parseProgressLogDate = (value: string, endOfDay = false): Date =>
  new Date(
    value.includes("T")
      ? value
      : `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  );

/**
 * Get progress logs with filtering
 */
export const getProgressLogs = async (
  filters: GetProgressLogsRequest,
): Promise<ProgressLogResponse[]> => {
  const { topicId, syllabusId, startDate, endDate, updatedBy } = filters;

  const logs = await prisma.syllabusProgressLog.findMany({
    where: {
      ...(topicId && { topicId }),
      ...(syllabusId && {
        topic: {
          syllabusId,
        },
      }),
      ...(updatedBy && { updatedBy }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: parseProgressLogDate(startDate) }),
          ...(endDate && { lte: parseProgressLogDate(endDate, true) }),
        },
      }),
    },
    include: {
      topic: {
        select: {
          id: true,
          title: true,
          serialNumber: true,
          syllabusId: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return logs.map(({ user, ...log }) => ({
    ...log,
    updatedByUser: user,
  })) as ProgressLogResponse[];
};

// ============================================
// STATISTICS & REPORTING
// ============================================

/**
 * Get syllabus statistics
 */
export const getSyllabusStatistics = async (
  filters: SyllabusStatisticsRequest,
): Promise<SyllabusStatisticsResponse> => {
  const {
    syllabusId,
    projectId,
    centerId,
    semesterId,
    semesterLevelId,
  } = filters;

  // Get all syllabi matching the filters
  const syllabi = await prisma.syllabus.findMany({
    where: {
      ...(syllabusId && { id: syllabusId }),
      ...(projectId && { projectId }),
      ...(centerId && { centerId }),
      ...(semesterId && { semesterId }),
      ...(semesterLevelId && { semesterLevelId }),
      isActive: true,
      semesterLevel: { isActive: true },
    },
    include: {
      topics: true,
    },
  });

  // Calculate overall statistics
  let totalTopics = 0;
  let pendingCount = 0;
  let ongoingCount = 0;
  let completedCount = 0;

  const cycleStats: Record<string, any> = {};
  const syllabusDetails: any[] = [];

  for (const syllabus of syllabi) {
    const topics = syllabus.topics;
    totalTopics += topics.length;

    let syllabusCompleted = 0;

    for (const topic of topics) {
      // Count by status
      if (topic.status === "PENDING") pendingCount++;
      else if (topic.status === "ONGOING") ongoingCount++;
      else if (topic.status === "COMPLETED") {
        completedCount++;
        syllabusCompleted++;
      }

      // Count by cycle
      if (topic.cycle) {
        if (!cycleStats[topic.cycle]) {
          cycleStats[topic.cycle] = {
            cycle: topic.cycle,
            total: 0,
            pending: 0,
            ongoing: 0,
            completed: 0,
          };
        }
        cycleStats[topic.cycle].total++;
        if (topic.status === "PENDING") cycleStats[topic.cycle].pending++;
        else if (topic.status === "ONGOING") cycleStats[topic.cycle].ongoing++;
        else if (topic.status === "COMPLETED")
          cycleStats[topic.cycle].completed++;
      }
    }

    syllabusDetails.push({
      id: syllabus.id,
      name: syllabus.name,
      semesterLevelId: syllabus.semesterLevelId,
      totalTopics: topics.length,
      completedTopics: syllabusCompleted,
      completionPercentage:
        topics.length > 0
          ? Math.round((syllabusCompleted / topics.length) * 100)
          : 0,
    });
  }

  const completionPercentage =
    totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  return {
    totalSyllabi: syllabi.length,
    totalTopics,
    statusBreakdown: {
      pending: pendingCount,
      ongoing: ongoingCount,
      completed: completedCount,
    },
    completionPercentage,
    cycleBreakdown: Object.values(cycleStats),
    syllabusDetails,
  };
};

// ============================================
// TEMPLATE & IMPORT OPERATIONS
// ============================================

/**
 * Import syllabus from predefined template
 * This would be implemented based on your specific template structure
 */
export const importSyllabusFromTemplate = async (
  data: ImportSyllabusFromTemplateRequest,
  userId: string,
): Promise<SyllabusResponse> => {
  const {
    projectId,
    centerId,
    semesterId,
    semesterLevelId,
    templateName,
    syllabusName,
    description,
  } = data;

  const semesterLevel = await resolveSemesterLevelInput({
    semesterId,
    semesterLevelId,
  });
  const templateLevelCode = semesterLevel.academicLevel.code;

  // TODO: Load template data from a file or database
  // For now, this is a placeholder that would need to be implemented
  // with actual template data

  throw new Error(
    `Template ${templateName || templateLevelCode} import not yet implemented. Please create syllabus manually or use bulk create.`,
  );
};
