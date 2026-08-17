import {
  AssessmentCycle,
  SyllabusTopicStatus,
} from "../generated/prisma/index.js";

export type CurriculumAssessmentCycle = Exclude<
  AssessmentCycle,
  "PRE_ASSESSMENT"
>;

// ============================================
// SYLLABUS TYPES
// ============================================

export interface CreateSyllabusRequest {
  projectId: string;
  centerId: string;
  semesterId: string;
  semesterLevelId: string;
  name: string;
  description?: string;
}

export interface UpdateSyllabusRequest {
  semesterLevelId?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface GetSyllabusRequest {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
  isActive?: boolean;
}

export interface SyllabusResponse {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  semesterLevelId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
  };
  center?: {
    id: string;
    name: string;
  };
  semester?: {
    id: string;
    name: string;
  };
  semesterLevel?: {
    id: string;
    academicLevel: {
      id: string;
      code: string;
      name: string;
      journeyOrder: number;
    };
  };
  topics?: SyllabusTopicResponse[];
  stats?: {
    totalTopics: number;
    pendingTopics: number;
    ongoingTopics: number;
    completedTopics: number;
  };
}

// ============================================
// SYLLABUS TOPIC TYPES
// ============================================

export interface CreateSyllabusTopicRequest {
  syllabusId: string;
  parentId?: string;
  serialNumber: string;
  title: string;
  cycle: CurriculumAssessmentCycle;
  orderIndex: number;
  metadata?: Record<string, any>;
}

export interface UpdateSyllabusTopicRequest {
  serialNumber?: string;
  title?: string;
  cycle?: CurriculumAssessmentCycle;
  status?: SyllabusTopicStatus;
  orderIndex?: number;
  metadata?: Record<string, any>;
}

export interface BulkCreateTopicsRequest {
  syllabusId: string;
  topics: {
    parentId?: string;
    serialNumber: string;
    title: string;
    cycle: CurriculumAssessmentCycle;
    orderIndex: number;
    metadata?: Record<string, any>;
  }[];
}

export interface UpdateTopicStatusRequest {
  status: SyllabusTopicStatus;
  notes?: string;
}

export interface ReorderTopicsRequest {
  topics: {
    id: string;
    orderIndex: number;
  }[];
}

export interface GetSyllabusTopicsRequest {
  syllabusId?: string;
  parentId?: string | null;
  cycle?: CurriculumAssessmentCycle;
  status?: SyllabusTopicStatus;
  includeSubtopics?: boolean;
}

export interface SyllabusTopicResponse {
  id: string;
  syllabusId: string;
  parentId?: string;
  serialNumber: string;
  title: string;
  cycle: CurriculumAssessmentCycle;
  status: SyllabusTopicStatus;
  orderIndex: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  parent?: {
    id: string;
    title: string;
    serialNumber: string;
  };
  subtopics?: SyllabusTopicResponse[];
  recentProgress?: {
    id: string;
    previousStatus: SyllabusTopicStatus;
    newStatus: SyllabusTopicStatus;
    updatedBy: string;
    updatedByUser: {
      id: string;
      name: string;
    };
    notes?: string;
    createdAt: Date;
  }[];
}

// ============================================
// PROGRESS LOG TYPES
// ============================================

export interface GetProgressLogsRequest {
  topicId?: string;
  syllabusId?: string;
  startDate?: string;
  endDate?: string;
  updatedBy?: string;
}

export interface ProgressLogResponse {
  id: string;
  topicId: string;
  previousStatus: SyllabusTopicStatus;
  newStatus: SyllabusTopicStatus;
  updatedBy: string;
  notes?: string;
  createdAt: Date;
  topic: {
    id: string;
    title: string;
    serialNumber: string;
    syllabusId: string;
  };
  updatedByUser: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
  };
}

// ============================================
// BULK IMPORT TYPES
// ============================================

export interface ImportSyllabusFromTemplateRequest {
  projectId: string;
  centerId: string;
  semesterId: string;
  semesterLevelId: string;
  templateName: string; // e.g., "PRIMARY_A", "LEVEL_1"
  syllabusName?: string;
  description?: string;
}

export interface SyllabusTemplate {
  name: string;
  topics: {
    serialNumber: string;
    title: string;
    cycle: CurriculumAssessmentCycle;
    orderIndex: number;
    subtopics?: {
      serialNumber: string;
      title: string;
      cycle: CurriculumAssessmentCycle;
      orderIndex: number;
    }[];
  }[];
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface SyllabusStatisticsRequest {
  syllabusId?: string;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
}

export interface SyllabusStatisticsResponse {
  totalSyllabi: number;
  totalTopics: number;
  statusBreakdown: {
    pending: number;
    ongoing: number;
    completed: number;
  };
  completionPercentage: number;
  cycleBreakdown?: {
    cycle: CurriculumAssessmentCycle;
    total: number;
    pending: number;
    ongoing: number;
    completed: number;
  }[];
  syllabusDetails?: {
    id: string;
    name: string;
    semesterLevelId: string;
    totalTopics: number;
    completedTopics: number;
    completionPercentage: number;
  }[];
}
