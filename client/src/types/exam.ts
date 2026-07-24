import type { AssessmentCycle } from "./api";
import type { LegacyLevel, LevelReference } from "./api";

/** @deprecated Use managed level references. */
export type Level = LegacyLevel;

export type { AssessmentCycle } from "./api";

export interface Exam extends LevelReference {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  /** @deprecated Use semesterLevelId and semesterLevel. */
  level: Level;
  cycle: AssessmentCycle;
  name: string;
  description?: string;
  examDate: string;
  listeningMaxMarks: number;
  speakingMaxMarks: number;
  readingMaxMarks: number;
  writingMaxMarks: number;
  totalMaxMarks: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  _count?: {
    studentScores: number;
  };
}

export interface StudentExamScore {
  id: string;
  examId: string;
  studentId: string;
  enrollmentId: string;
  listeningScore: number;
  speakingScore: number;
  readingScore: number;
  writingScore: number;
  totalScore: number;
  remarks?: string;
  gradedBy?: string;
  gradedAt?: string;
  isAbsent: boolean;
  createdAt: string;
  updatedAt: string;
  exam?: LevelReference & {
    id: string;
    name: string;
    examDate: string;
    level: Level;
  };
  student?: {
    id: string;
    name: string;
    profileImageUrl?: string;
  };
  grader?: {
    id: string;
    name: string;
  };
}

export interface CreateExamRequest extends LevelReference {
  projectId: string;
  centerId: string;
  semesterId: string;
  level?: Level;
  cycle: AssessmentCycle;
  name: string;
  description?: string;
  examDate: string;
  listeningMaxMarks: number;
  speakingMaxMarks: number;
  readingMaxMarks: number;
  writingMaxMarks: number;
}

export interface UpdateExamRequest extends LevelReference {
  name?: string;
  description?: string;
  level?: Level;
  cycle?: AssessmentCycle;
  examDate?: string;
  listeningMaxMarks?: number;
  speakingMaxMarks?: number;
  readingMaxMarks?: number;
  writingMaxMarks?: number;
  isActive?: boolean;
}

export interface CreateStudentScoreRequest {
  examId: string;
  studentId: string;
  enrollmentId: string;
  listeningScore: number;
  speakingScore: number;
  readingScore: number;
  writingScore: number;
  remarks?: string;
  isAbsent?: boolean;
}

export interface UpdateStudentScoreRequest {
  listeningScore?: number;
  speakingScore?: number;
  readingScore?: number;
  writingScore?: number;
  remarks?: string;
  isAbsent?: boolean;
}

export interface ExamStatistics {
  examId: string;
  totalStudents: number;
  scoresEntered: number;
  absentStudents: number;
  pendingScores: number;
  averageScores: {
    listening: number;
    speaking: number;
    reading: number;
    writing: number;
    total: number;
  };
  topScorers: {
    studentId: string;
    studentName: string;
    totalScore: number;
  }[];
}
