export interface semester {
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  centerId: string;
}

export interface CreateSemesterInput {
  name: string;
  startDate: string;
  endDate: string;
  centerId: string;
  academicLevelIds?: string[];
  sourceSemesterId?: string;
}

export interface UpdateSemesterInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  academicLevelIds?: string[];
}
