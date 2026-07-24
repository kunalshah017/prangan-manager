export interface ScoreComponents {
  listeningScore: number;
  speakingScore: number;
  readingScore: number;
  writingScore: number;
}

export interface ExamScoreMaxima {
  listeningMaxMarks: number;
  speakingMaxMarks: number;
  readingMaxMarks: number;
  writingMaxMarks: number;
  totalMaxMarks: number;
}

export interface ScoreComponentInput {
  listeningScore: unknown;
  speakingScore: unknown;
  readingScore: unknown;
  writingScore: unknown;
}

export interface ValidatedScoreComponents extends ScoreComponents {
  totalScore: number;
  isAbsent: boolean;
}

type RawRecord = Record<string, unknown>;

type ParseResult<T> = { data: T } | { error: string };

export interface ParsedCreateStudentScore {
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

export interface ParsedBulkCreateScores {
  examId: string;
  scores: Omit<ParsedCreateStudentScore, "examId">[];
}

export interface ParsedUpdateStudentScore {
  listeningScore?: number;
  speakingScore?: number;
  readingScore?: number;
  writingScore?: number;
  remarks?: string;
  isAbsent?: boolean;
}

const asRecord = (input: unknown): RawRecord | null =>
  typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as RawRecord)
    : null;

const isCanonicalId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value === value.trim();

const parseScoreFields = (
  input: RawRecord,
  includeExamId: boolean,
): ParseResult<
  ParsedCreateStudentScore | Omit<ParsedCreateStudentScore, "examId">
> => {
  const ids = includeExamId
    ? ["examId", "studentId", "enrollmentId"]
    : ["studentId", "enrollmentId"];
  if (ids.some((field) => !isCanonicalId(input[field]))) {
    return {
      error: "examId, studentId, and enrollmentId must be canonical IDs",
    };
  }
  if (input.isAbsent !== undefined && typeof input.isAbsent !== "boolean") {
    return { error: "isAbsent must be a boolean" };
  }
  if (input.remarks !== undefined && typeof input.remarks !== "string") {
    return { error: "remarks must be a string" };
  }
  if (
    !input.isAbsent &&
    ["listeningScore", "speakingScore", "readingScore", "writingScore"].some(
      (field) => input[field] === undefined,
    )
  ) {
    return { error: "LSRW scores are required unless marked absent" };
  }

  const score = {
    studentId: input.studentId as string,
    enrollmentId: input.enrollmentId as string,
    listeningScore: input.listeningScore,
    speakingScore: input.speakingScore,
    readingScore: input.readingScore,
    writingScore: input.writingScore,
    ...(input.remarks !== undefined && { remarks: input.remarks as string }),
    ...(input.isAbsent !== undefined && {
      isAbsent: input.isAbsent as boolean,
    }),
  };
  return includeExamId
    ? {
        data: {
          examId: input.examId as string,
          ...score,
        } as ParsedCreateStudentScore,
      }
    : { data: score as Omit<ParsedCreateStudentScore, "examId"> };
};

export const parseCreateStudentScore = (
  input: unknown,
): ParseResult<ParsedCreateStudentScore> => {
  const record = asRecord(input);
  if (!record) return { error: "Score request body must be an object" };
  return parseScoreFields(
    record,
    true,
  ) as ParseResult<ParsedCreateStudentScore>;
};

export const parseBulkCreateScores = (
  input: unknown,
): ParseResult<ParsedBulkCreateScores> => {
  const record = asRecord(input);
  if (!record || !isCanonicalId(record.examId)) {
    return { error: "examId must be a canonical ID" };
  }
  if (!Array.isArray(record.scores) || record.scores.length === 0) {
    return { error: "scores must be a nonempty array" };
  }

  const scores: Omit<ParsedCreateStudentScore, "examId">[] = [];
  for (const entry of record.scores) {
    const score = asRecord(entry);
    if (!score) return { error: "Each score must be an object" };
    const parsed = parseScoreFields(score, false);
    if ("error" in parsed) return parsed;
    scores.push(parsed.data as Omit<ParsedCreateStudentScore, "examId">);
  }
  return { data: { examId: record.examId, scores } };
};

export const parseUpdateStudentScore = (
  input: unknown,
): ParseResult<ParsedUpdateStudentScore> => {
  const record = asRecord(input);
  if (!record || Object.keys(record).length === 0) {
    return { error: "Score update body must be a nonempty object" };
  }
  const allowed = new Set([
    "listeningScore",
    "speakingScore",
    "readingScore",
    "writingScore",
    "remarks",
    "isAbsent",
  ]);
  if (Object.keys(record).some((field) => !allowed.has(field))) {
    return { error: "Score update contains unsupported fields" };
  }
  if (record.isAbsent !== undefined && typeof record.isAbsent !== "boolean") {
    return { error: "isAbsent must be a boolean" };
  }
  if (record.remarks !== undefined && typeof record.remarks !== "string") {
    return { error: "remarks must be a string" };
  }
  return { data: record as unknown as ParsedUpdateStudentScore };
};

const validateScoreComponent = (
  name: string,
  value: unknown,
  maximum: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} score must be a nonnegative finite number`);
  }

  if (value > maximum) {
    throw new Error(`${name} score exceeds maximum marks (${maximum})`);
  }

  return value;
};

export const buildScoreComponents = (
  input: ScoreComponentInput,
  maxima: ExamScoreMaxima,
  isAbsent: unknown = false,
): ValidatedScoreComponents => {
  if (isAbsent !== undefined && typeof isAbsent !== "boolean") {
    throw new Error("isAbsent must be a boolean");
  }

  if (isAbsent) {
    return {
      listeningScore: 0,
      speakingScore: 0,
      readingScore: 0,
      writingScore: 0,
      totalScore: 0,
      isAbsent: true,
    };
  }

  const components: ScoreComponents = {
    listeningScore: validateScoreComponent(
      "Listening",
      input.listeningScore,
      maxima.listeningMaxMarks,
    ),
    speakingScore: validateScoreComponent(
      "Speaking",
      input.speakingScore,
      maxima.speakingMaxMarks,
    ),
    readingScore: validateScoreComponent(
      "Reading",
      input.readingScore,
      maxima.readingMaxMarks,
    ),
    writingScore: validateScoreComponent(
      "Writing",
      input.writingScore,
      maxima.writingMaxMarks,
    ),
  };
  const totalScore =
    components.listeningScore +
    components.speakingScore +
    components.readingScore +
    components.writingScore;

  if (totalScore > maxima.totalMaxMarks) {
    throw new Error(
      `Total score exceeds maximum marks (${maxima.totalMaxMarks})`,
    );
  }

  return { ...components, totalScore, isAbsent: false };
};
