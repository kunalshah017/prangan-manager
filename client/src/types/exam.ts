export type Level =
  | "LEVEL_1"
  | "LEVEL_2"
  | "LEVEL_3"
  | "LEVEL_4"
  | "PRIMARY_A"
  | "PRIMARY_B";

export type ExamCycle = "PRE_ASSESSMENT" | "SA_1" | "SA_2" | "SA_3";

export interface Exam {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  level: Level;
  cycle: ExamCycle;
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
  exam?: {
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

export interface CreateExamRequest {
  projectId: string;
  centerId: string;
  semesterId: string;
  level: Level;
  cycle: ExamCycle;
  name: string;
  description?: string;
  examDate: string;
  listeningMaxMarks: number;
  speakingMaxMarks: number;
  readingMaxMarks: number;
  writingMaxMarks: number;
}

export interface UpdateExamRequest {
  name?: string;
  description?: string;
  level?: Level;
  cycle?: ExamCycle;
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
