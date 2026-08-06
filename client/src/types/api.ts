/** @deprecated Use SemesterLevel references for operational data. */
export type LegacyLevel = string;

export interface AcademicLevel {
  id: string;
  code: string;
  name: string;
  journeyOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SemesterLevel {
  id: string;
  semesterId: string;
  academicLevelId: string;
  isActive: boolean;
  academicLevel: AcademicLevel;
  createdAt?: string;
  updatedAt?: string;
}

export interface LevelReference {
  semesterLevelId?: string | null;
  semesterLevel?: SemesterLevel | null;
  /** @deprecated Use semesterLevelId and semesterLevel. */
  level?: LegacyLevel;
}

// Base Entity Types
export interface User {
  id: string;
  name: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  email: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "APPROVED" | "REJECTED";
  phone?: string;
  qualification?: string;
  address?: string;
  dob?: string;
  profileImageUrl?: string;
  reimbursementAmount?: number;
  remunerationRates?: Array<{
    semesterId: string;
    dailyRate: number | string;
  }>;
  // Optional bank details
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  upiId?: string | null;
  createdAt: string;
  updatedAt: string;
  roleAssignments?: (LevelReference & {
    id: string;
    subRole:
      | "TRAINING_DEVELOPMENT"
      | "RECRUITMENT"
      | "GROWTH_DEVELOPMENT"
      | "CURRICULUM_MENTOR"
      | "TECH"
      | "CENTER_MANAGER"
      | "EDUCATOR";
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
    isActive: boolean;
  })[];
}

export interface RemunerationUser {
  id: string;
  name: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  dailyRate: number | null;
  remunerationPeriods?: RemunerationPeriod[];
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  upiId?: string | null;
}

export interface RemunerationPeriod {
  id: string;
  amountPerDay: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export type ExpenseStatus = "ACTIVE" | "VOIDED";
export type ExpenseType = "REMUNERATION" | "MANUAL" | string;

export interface Expense {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  expenseType: ExpenseType;
  category: string;
  title: string;
  amount: number;
  incurredOn: string;
  notes?: string | null;
  payeeUserId?: string | null;
  sourceKey?: string | null;
  metadata?: Record<string, unknown> | null;
  status: ExpenseStatus;
  createdBy: string;
  createdByUser?: Pick<User, "id" | "name"> | null;
  payee?: Pick<User, "id" | "name"> | null;
  voidedBy?: string | null;
  voidedByUser?: Pick<User, "id" | "name"> | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseTotals {
  active: number;
  remuneration: number;
  manual: number;
  voided: number;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  totals: ExpenseTotals;
  categories: string[];
}

export interface RemunerationPaymentResult {
  userId: string;
  status: "PAID" | "ALREADY_PAID" | "INCOMPLETE" | "NO_PAYMENT_DUE";
  amount?: number;
  paidAt?: string;
  expenseId?: string;
  missingDates?: string[];
  reason?: "NOT_ELIGIBLE" | "MISSING_REMUNERATION" | "PROCESSING_FAILED";
  message?: string;
}

export interface RemunerationPaymentResponse {
  results: RemunerationPaymentResult[];
}

export interface SemesterUser extends ContextStaffUser {
  email: string;
  remunerationPeriods: RemunerationPeriod[];
}

export interface ContextStaffUser {
  id: string;
  name: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  dob?: string | null;
  roleAssignments: NonNullable<User["roleAssignments"]>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  metadata?: Record<string, unknown>;
  projectType?: string;
  imageUrl?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Center {
  id: string;
  name: string;
  address: string;
  projectId?: string;
  project?: {
    id: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  centerId: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  center?: {
    id: string;
    name: string;
  };
  levels?: SemesterLevel[];
  createdAt: string;
  updatedAt: string;
}

export interface Student extends LevelReference {
  id: string;
  name: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string;
  dob?: string;
  phoneNumber?: string;
  whatsappNumber?: string;
  alternateNumber?: string;
  fatherName?: string;
  motherName?: string;
  address?: string;
  schoolName?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  familyIncome?: string;
  futureProfession?: string;
  futureProfessionImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy level remains during page migration.
}

export interface StudentEnrollment extends LevelReference {
  id: string;
  studentId: string;
  centerId: string;
  semesterId: string;
  projectId: string;
  /** @deprecated Use semesterLevelId and semesterLevel. */
  level: LegacyLevel;
  isActive: boolean;
  enrolledAt: string;
  promotedAt?: string;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  center?: {
    id: string;
    name: string;
    address?: string;
  };
  project?: {
    id: string;
    name: string;
    projectType?: string;
  };
  semester?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

// Generic API Response Types
export interface ApiResponse<T = unknown> {
  message: string;
  data?: T;
}

export interface ListResponse<T> {
  [key: string]: T[];
}

export interface SingleResponse<T> {
  [key: string]: T;
}

// Generic helper types for CRUD operations
export type CreateRequest<T, K extends keyof T = keyof T> = Pick<T, K>;
export type UpdateRequest<T, K extends keyof T = keyof T> = Partial<Pick<T, K>>;

// Generic response types
export type EntityResponse<T, K extends string> = ApiResponse<T> & Record<K, T>;
export type EntityListResponse<T, K extends string> = ListResponse<T> &
  Record<K, T[]>;

// Message response type
export interface MessageResponse extends ApiResponse<null> {
  message: string;
}

// Auth API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends ApiResponse<{
  user: User;
}> {
  user: User;
}

export type RegisterRequest = Pick<
  User,
  | "email"
  | "firstName"
  | "middleName"
  | "lastName"
  | "phone"
  | "qualification"
  | "address"
  | "dob"
  | "profileImageUrl"
>;

export type RegisterResponse = ApiResponse<null>;

export interface UserDetailsResponse extends ApiResponse<User> {
  user: User;
}

// Project API Types
export type CreateProjectRequest = CreateRequest<
  Project,
  "name" | "description" | "metadata" | "projectType" | "imageUrl"
>;
export type UpdateProjectRequest = UpdateRequest<
  Project,
  "name" | "description" | "status" | "metadata" | "projectType" | "imageUrl"
>;
export type CreateProjectResponse = EntityResponse<Project, "project">;
export type ProjectsResponse = EntityListResponse<Project, "projects">;
export type ProjectResponse = EntityResponse<Project, "project">;
export type UpdateProjectResponse = EntityResponse<Project, "project">;

// Center API Types
export type CreateCenterRequest = CreateRequest<
  Center,
  "name" | "address" | "projectId" | "metadata"
>;
export type UpdateCenterRequest = UpdateRequest<
  Center,
  "name" | "address" | "metadata"
>;
export type CreateCenterResponse = EntityResponse<Center, "center">;
export type CentersResponse = EntityListResponse<Center, "centers">;
export type CenterResponse = EntityResponse<Center, "center">;
export type UpdateCenterResponse = EntityResponse<Center, "center">;

// Semester API Types
export type CreateSemesterRequest = CreateRequest<
  Semester,
  "name" | "startDate" | "endDate"
> & {
  centerId?: string; // Made optional since README doesn't show it in request
  academicLevelIds?: string[];
  sourceSemesterId?: string;
};
export type UpdateSemesterRequest = UpdateRequest<
  Semester,
  "name" | "startDate" | "endDate"
> & { academicLevelIds?: string[] };
export type CreateSemesterResponse = EntityResponse<Semester, "semester">;
export type SemestersResponse = EntityListResponse<Semester, "semesters">;
export type SemesterResponse = EntityResponse<Semester, "semester">;
export type UpdateSemesterResponse = EntityResponse<Semester, "semester">;

export type StudentTransitionDecision = {
  sourceEnrollmentId: string;
  studentId: string;
  decision:
    | "REVIEW"
    | "PROMOTE"
    | "RETAIN"
    | "PASSED_OUT"
    | "NOT_CONTINUING";
  targetSemesterLevelId?: string;
  student?: Student;
  sourceLevel?: AcademicLevel | null;
  promotionSuggestion?: PromotionSuggestion;
};

export type PromotionSuggestion = {
  decision: "REVIEW" | "PROMOTE" | "RETAIN" | "PASSED_OUT";
  targetSemesterLevelId?: string;
  evidence: {
    status: "SCORED" | "MISSING" | "ABSENT" | "INVALID";
    reason:
      | "ABOVE_THRESHOLD"
      | "AT_OR_BELOW_THRESHOLD"
      | "FINAL_LEVEL_COMPLETED"
      | "NEXT_LEVEL_UNAVAILABLE"
      | "CURRENT_LEVEL_UNAVAILABLE"
      | "ASSESSMENT_MISSING"
      | "ASSESSMENT_ABSENT"
      | "ASSESSMENT_INVALID";
    threshold: 70;
    percentage?: number;
    examId?: string;
    examName?: string;
    examDate?: string;
  };
};

export type StaffTransitionDecision = {
  userId: string;
  decision: "ASSIGN" | "NOT_CONTINUING";
  assignments: RoleAssignment[];
  dailyRate?: number | null;
  user?: Pick<
    User,
    "id" | "name" | "firstName" | "middleName" | "lastName"
  > | null;
};

export interface SemesterTransition {
  id: string;
  semesterId: string;
  sourceSemesterId?: string | null;
  status: "DRAFT" | "COMPLETED";
  semester: Semester & { levels: SemesterLevel[] };
  sourceSemester?: Pick<Semester, "id" | "name"> | null;
  studentPlan: StudentTransitionDecision[];
  staffPlan: StaffTransitionDecision[];
  progress: {
    students: { resolved: number; total: number };
    staff: { resolved: number; total: number };
    rates: { resolved: number; total: number };
  };
  createdAt: string;
  updatedAt: string;
}

export interface SemesterSetupSummary {
  semester: Pick<
    Semester,
    "id" | "name" | "status" | "startDate" | "endDate"
  >;
  sourceSemester: Pick<Semester, "id" | "name"> | null;
  updatedAt: string;
  progress: {
    students: { resolved: number; total: number };
    staff: { resolved: number; total: number };
    rates: { resolved: number; total: number };
  };
}

export interface SemesterSetupSummariesResponse {
  setupSummaries: SemesterSetupSummary[];
}

// Managed Academic Level API Types
export interface CreateAcademicLevelRequest {
  code: string;
  name: string;
  afterLevelId?: string;
}

export interface UpdateAcademicLevelRequest {
  name?: string;
  isActive?: boolean;
}

export interface ReorderAcademicLevelsRequest {
  orderedIds: string[];
}

export interface ReplaceSemesterLevelsRequest {
  academicLevelIds: string[];
}

export type AcademicLevelsResponse = EntityListResponse<
  AcademicLevel,
  "levels"
>;
export type AcademicLevelResponse = EntityResponse<AcademicLevel, "level">;
export type SemesterLevelsResponse = EntityListResponse<
  SemesterLevel,
  "levels"
>;

// User Management API Types
export type UsersResponse = EntityListResponse<User, "users">;
export type RemunerationUsersResponse = EntityListResponse<
  RemunerationUser,
  "users"
>;
export type ContextStaffResponse = EntityListResponse<
  ContextStaffUser,
  "users"
>;
export type SemesterUsersResponse = EntityListResponse<
  SemesterUser,
  "users"
>;

// Role Assignment Types
export interface RoleAssignment extends LevelReference {
  subRole:
    | "TRAINING_DEVELOPMENT"
    | "RECRUITMENT"
    | "GROWTH_DEVELOPMENT"
    | "CURRICULUM_MENTOR"
    | "TECH"
    | "CENTER_MANAGER"
    | "EDUCATOR";
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
}

// Registration Requests API Types
export type RegistrationRequestsResponse = EntityListResponse<User, "users">;
export type VerifyUserRequest = {
  userId: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  role: "USER" | "ADMIN";
  roleAssignments?: RoleAssignment[];
  rejectionReason?: string;
};
export type VerifyUserResponse = MessageResponse;

// Student API Types
export interface StudentEnrollmentData extends LevelReference {
  centerId?: string;
  semesterId?: string;
  projectId?: string;
}

export type CreateStudentRequest = CreateRequest<
  Student,
  | "firstName"
  | "middleName"
  | "lastName"
  | "profileImageUrl"
  | "dob"
  | "phoneNumber"
  | "whatsappNumber"
  | "alternateNumber"
  | "fatherName"
  | "motherName"
  | "address"
  | "schoolName"
  | "fatherOccupation"
  | "motherOccupation"
  | "familyIncome"
  | "futureProfession"
> & {
  enrollment?: StudentEnrollmentData;
};

export type UpdateStudentRequest = UpdateRequest<
  Student,
  | "firstName"
  | "middleName"
  | "lastName"
  | "profileImageUrl"
  | "dob"
  | "phoneNumber"
  | "whatsappNumber"
  | "alternateNumber"
  | "fatherName"
  | "motherName"
  | "address"
  | "schoolName"
  | "fatherOccupation"
  | "motherOccupation"
  | "familyIncome"
  | "futureProfession"
> & {
  enrollment?: StudentEnrollmentData;
};

export interface CreateStudentResponse extends EntityResponse<
  Student,
  "student"
> {
  enrollment?: StudentEnrollment;
}

export type StudentsResponse = EntityListResponse<Student, "students">;
export type StudentResponse = EntityResponse<Student, "student">;

export interface UpdateStudentResponse extends EntityResponse<
  Student,
  "student"
> {
  enrollment?: StudentEnrollment;
}

// Student Enrollment API Types
export type StudentEnrollmentsResponse = {
  message: string;
  enrollments: StudentEnrollment[];
};

// Attendance API Types
export interface AttendanceUser {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  roleAssignments: (LevelReference & {
    id: string;
    subRole: "CENTER_MANAGER" | "EDUCATOR";
    committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    isActive: boolean;
  })[];
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";
  roleAssignmentId: string;
  projectId: string;
  projectName: string;
  centerId: string;
  centerName: string;
  semesterId: string;
  semesterName: string;
  notes?: string;
  holidayReason?: string;
  markedBy?: string;
  markedByName?: string;
  markedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profileImageUrl?: string;
  };
  roleAssignment?: LevelReference & {
    id: string;
    subRole: "CENTER_MANAGER" | "EDUCATOR";
    committedDays?: "SATURDAY" | "SUNDAY" | "BOTH";
  };
}

// Student Attendance Types
export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  enrollmentId: string;
  projectId: string;
  projectName: string;
  centerId: string;
  centerName: string;
  semesterId: string;
  semesterName: string;
  notes?: string;
  holidayReason?: string;
  markedBy?: string;
  markedAt?: string;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    name: string;
    profileImageUrl?: string;
  };
  enrollment?: LevelReference & {
    id: string;
    /** @deprecated Use semesterLevelId and semesterLevel. */
    level: LegacyLevel;
  };
  project?: {
    id: string;
    name: string;
  };
  center?: {
    id: string;
    name: string;
    address?: string;
  };
  semester?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  markedByUser?: {
    id: string;
    name: string;
  };
}

export interface ActiveUsersResponse {
  message: string;
  data: {
    users: AttendanceUser[];
    totalUsers: number;
  };
}

export interface MarkAttendanceRequest {
  userId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";
  roleAssignmentId: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  notes?: string;
  holidayReason?: string;
}

export interface BulkMarkAttendanceRequest {
  date: string;
  attendances: {
    userId: string;
    status: "PRESENT" | "ABSENT" | "NOT_AVAILABLE" | "HOLIDAY";
    roleAssignmentId: string;
    notes?: string;
    holidayReason?: string;
  }[];
  projectId: string;
  centerId: string;
  semesterId: string;
}

// Student Attendance Request Types
export interface MarkStudentAttendanceRequest {
  studentId: string;
  enrollmentId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  projectId: string;
  centerId: string;
  semesterId: string;
  notes?: string;
  holidayReason?: string;
}

export interface BulkMarkStudentAttendanceRequest {
  date: string;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  projectId: string;
  centerId: string;
  semesterId: string;
  studentAttendances: {
    studentId: string;
    enrollmentId: string;
    status: "PRESENT" | "ABSENT" | "HOLIDAY";
    notes?: string;
  }[];
  holidayReason?: string;
}

export interface MarkAttendanceResponse {
  message: string;
  attendance: AttendanceRecord;
}

export interface BulkMarkAttendanceResponse {
  message: string;
  errors: string[];
}

// Student Attendance Response Types
export interface MarkStudentAttendanceResponse {
  message: string;
  attendance: StudentAttendanceRecord;
}

export interface BulkMarkStudentAttendanceResponse {
  message: string;
  attendances: StudentAttendanceRecord[];
  processed: number;
  total: number;
}

export interface StudentAttendanceRecordsResponse {
  message: string;
  attendance: StudentAttendanceRecord[];
}

// Students by semester response
export interface StudentsBySemesterResponse {
  message: string;
  enrollments: (StudentEnrollment & {
    student: Student;
    center: {
      id: string;
      name: string;
      address: string;
    };
    project: {
      id: string;
      name: string;
      projectType?: string;
    };
  })[];
}

export interface AttendanceRecordsResponse {
  message: string;
  data: {
    attendances: AttendanceRecord[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Generic Response Types
export interface MessageResponse extends ApiResponse<null> {
  message: string;
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

// ============================================
// SYLLABUS TYPES
// ============================================

/** @deprecated Use managed AcademicLevel and SemesterLevel references. */
export type Level = LegacyLevel;

export type AssessmentCycle = "PRE_ASSESSMENT" | "SA_1" | "SA_2" | "SA_3";
export type CurriculumAssessmentCycle = Exclude<
  AssessmentCycle,
  "PRE_ASSESSMENT"
>;

export type SyllabusTopicStatus = "PENDING" | "ONGOING" | "COMPLETED";

export interface Syllabus extends LevelReference {
  id: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  /** @deprecated Use semesterLevelId and semesterLevel. */
  level: Level;
  name: string;
  description?: string;
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
  topics?: SyllabusTopic[];
  stats?: {
    totalTopics: number;
    pendingTopics: number;
    ongoingTopics: number;
    completedTopics: number;
  };
}

export interface SyllabusTopic {
  id: string;
  syllabusId: string;
  parentId?: string;
  serialNumber: string;
  title: string;
  cycle: CurriculumAssessmentCycle;
  status: SyllabusTopicStatus;
  orderIndex: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    title: string;
    serialNumber: string;
  };
  subtopics?: SyllabusTopic[];
  recentProgress?: SyllabusProgressLog[];
}

export interface SyllabusProgressLog {
  id: string;
  topicId: string;
  previousStatus: SyllabusTopicStatus;
  newStatus: SyllabusTopicStatus;
  updatedBy: string;
  updatedByUser: {
    id: string;
    name: string;
  };
  notes?: string;
  createdAt: string;
}

export interface SyllabusStatistics {
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
    level: Level;
    totalTopics: number;
    completedTopics: number;
    completionPercentage: number;
  }[];
}

// Request Types
export interface CreateSyllabusRequest extends LevelReference {
  projectId: string;
  centerId: string;
  semesterId: string;
  /** @deprecated Use semesterLevelId. */
  level?: Level;
  name: string;
  description?: string;
}

export interface UpdateSyllabusRequest extends LevelReference {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateSyllabusTopicRequest {
  syllabusId: string;
  parentId?: string;
  serialNumber: string;
  title: string;
  cycle: CurriculumAssessmentCycle;
  orderIndex: number;
  metadata?: Record<string, unknown>;
}

export interface BulkCreateTopicsRequest {
  syllabusId: string;
  topics: {
    parentId?: string;
    serialNumber: string;
    title: string;
    cycle: CurriculumAssessmentCycle;
    orderIndex: number;
    metadata?: Record<string, unknown>;
  }[];
}

export interface UpdateSyllabusTopicRequest {
  serialNumber?: string;
  title?: string;
  cycle?: CurriculumAssessmentCycle;
  status?: SyllabusTopicStatus;
  orderIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateTopicStatusRequest {
  status: SyllabusTopicStatus;
  notes?: string;
}

// Response Types
export interface SyllabusResponse {
  message: string;
  data: Syllabus;
}

export interface SyllabiResponse {
  message: string;
  data: Syllabus[];
  total: number;
}

export interface SyllabusTopicResponse {
  message: string;
  data: SyllabusTopic;
}

export interface SyllabusTopicsResponse {
  message: string;
  data: SyllabusTopic[];
  total: number;
}

export interface SyllabusStatisticsResponse {
  message: string;
  data: SyllabusStatistics;
}

export interface ProgressLogsResponse {
  message: string;
  data: SyllabusProgressLog[];
  total: number;
}
