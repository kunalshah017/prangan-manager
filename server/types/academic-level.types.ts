export interface AcademicLevelDto {
  id: string;
  code: string;
  name: string;
  journeyOrder: number;
  isActive: boolean;
}

export interface SemesterLevelDto {
  id: string;
  semesterId: string;
  isActive: boolean;
  academicLevel: AcademicLevelDto;
}

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
