import { Level } from "../generated/prisma/index.js";

// ============================================
// EXAM TYPES
// ============================================

export interface CreateExamRequest {
  projectId: string;
  centerId: string;
  semesterId: string;
  level: Level;
  name: string;
  description?: string;
  examDate: string; // ISO date string
  listeningMaxMarks: number;
  speakingMaxMarks: number;
  readingMaxMarks: number;
  writingMaxMarks: number;
}

export interface UpdateExamRequest {
  name?: string;
  description?: string;
  examDate?: string; // ISO date string
  listeningMaxMarks?: number;
  speakingMaxMarks?: number;
  readingMaxMarks?: number;
  writingMaxMarks?: number;
  isActive?: boolean;
}

export interface GetExamsRequest {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  level?: Level;
  isActive?: boolean;
  startDate?: string; // Filter exams from this date
  endDate?: string; // Filter exams until this date
}

export interface ExamResponse {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  level: Level;
  name: string;
  description?: string;
  examDate: Date;
  listeningMaxMarks: number;
  speakingMaxMarks: number;
  readingMaxMarks: number;
  writingMaxMarks: number;
  totalMaxMarks: number;
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
  _count?: {
    studentScores: number;
  };
}

// ============================================
// STUDENT EXAM SCORE TYPES
// ============================================

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

export interface BulkCreateScoresRequest {
  examId: string;
  scores: {
    studentId: string;
    enrollmentId: string;
    listeningScore: number;
    speakingScore: number;
    readingScore: number;
    writingScore: number;
    remarks?: string;
    isAbsent?: boolean;
  }[];
}

export interface GetStudentScoresRequest {
  examId?: string;
  studentId?: string;
  enrollmentId?: string;
}

export interface StudentScoreResponse {
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
  gradedAt?: Date;
  isAbsent: boolean;
  createdAt: Date;
  updatedAt: Date;
  exam?: {
    id: string;
    name: string;
    examDate: Date;
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

// ============================================
// EXAM STATISTICS TYPES
// ============================================

export interface ExamStatisticsRequest {
  examId: string;
}

export interface ExamStatisticsResponse {
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
