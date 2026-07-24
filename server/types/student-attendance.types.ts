export interface StudentAttendanceCreateInput {
  studentId: string;
  date: string; // YYYY-MM-DD format
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  enrollmentId: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  notes?: string;
  holidayReason?: string;
}

export interface StudentAttendanceUpdateInput {
  status?: "PRESENT" | "ABSENT" | "HOLIDAY";
  notes?: string;
  holidayReason?: string | null;
}

export interface StudentAttendanceFilter {
  studentId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  enrollmentId?: string;
  status?: "PRESENT" | "ABSENT" | "HOLIDAY";
}

export interface StudentAttendanceWithDetails {
  id: string;
  studentId: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  enrollmentId: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  notes?: string | null;
  holidayReason?: string | null;
  markedBy?: string | null;
  markedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    name: string;
    profileImageUrl?: string | null;
  };
  enrollment: {
    id: string;
    level: string;
    semesterLevelId: string | null;
    semesterLevel: {
      id: string;
      academicLevel: {
        id: string;
        code: string;
        name: string;
        journeyOrder: number;
      };
    } | null;
  };
  project: {
    id: string;
    name: string;
  };
  center: {
    id: string;
    name: string;
    address?: string | null;
  };
  semester: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  markedByUser?: {
    id: string;
    name: string;
  } | null;
}

export interface StudentAttendanceStats {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  holidayDays: number;
  attendancePercentage: number;
}

export interface BulkStudentAttendanceInput {
  date: string; // YYYY-MM-DD format
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  studentAttendances: Array<{
    studentId: string;
    enrollmentId: string;
    status?: "PRESENT" | "ABSENT" | "HOLIDAY"; // Can override the bulk status
    notes?: string;
  }>;
  projectId: string;
  centerId: string;
  semesterId: string;
  holidayReason?: string;
}

export interface BulkStudentAttendanceResponse {
  processedCount: number;
  errors: Array<{
    studentId: string;
    error: string;
  }>;
  attendances: Array<{
    id: string;
    studentId: string;
    date: Date;
    status: "PRESENT" | "ABSENT" | "HOLIDAY";
    student: {
      id: string;
      name: string;
    };
  }>;
}

export interface StudentAttendanceData {
  studentId: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "HOLIDAY";
  enrollmentId: string;
  projectId: string;
  centerId: string;
  semesterId: string;
  notes?: string;
  holidayReason?: string | null;
  markedBy: string;
  markedAt: Date;
}
