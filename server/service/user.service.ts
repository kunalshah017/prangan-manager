import { PrismaClient } from "../generated/prisma/index.js";
import type { User } from "../generated/prisma/index.js";
import { UserStatus, Level, Role } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const createUser = async (
  userData: Omit<User, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const user = await prisma.user.create({
      data: userData,
    });
    return user;
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    return "Failed to create user";
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user;
  } catch (error: unknown) {
    console.error("Error fetching user by email:", error);
    return "Failed to fetch user";
  }
};

export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        role: true,
        status: true,
        phone: true,
        qualification: true,
        address: true,
        dob: true,
        createdAt: true,
        updatedAt: true,
        roleAssignments: {
          where: { isActive: true },
          include: {
            project: { select: { id: true, name: true } },
            center: { select: { id: true, name: true } },
            semester: { select: { id: true, name: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });
    return user;
  } catch (error: unknown) {
    console.error("Error fetching user by ID:", error);
    return "Failed to fetch user";
  }
};

export const updateUser = async (
  id: string,
  status: UserStatus,
  role: Role,
  password: string
) => {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        status: status,
        role: role,
        password: password,
      },
    });
    return user;
  } catch (error: unknown) {
    console.error("Error updating user:", error);
    return "Failed to update user";
  }
};

export const getUnverifiedUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      select: {
        id: true,
        email: true,
        name: true,
        profileImageUrl: true,
        role: true,
        phone: true,
        qualification: true,
        address: true,
        dob: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  } catch (error: unknown) {
    console.error("Error fetching unverified users:", error);
    return "Failed to fetch unverified users";
  }
};

// Student service functions
export const createStudent = async (studentData: any) => {
  try {
    const student = await prisma.students.create({
      data: studentData,
    });
    return student;
  } catch (error: unknown) {
    console.error("Error creating student:", error);
    return "Failed to create student";
  }
};

export const getAllStudents = async () => {
  try {
    const students = await prisma.students.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return students;
  } catch (error: unknown) {
    console.error("Error fetching students:", error);
    return "Failed to fetch students";
  }
};

export const getStudentById = async (id: string) => {
  try {
    const student = await prisma.students.findUnique({
      where: { id },
    });
    return student;
  } catch (error: unknown) {
    console.error("Error fetching student by ID:", error);
    return "Failed to fetch student";
  }
};

export const updateStudent = async (id: string, studentData: any) => {
  try {
    const { id: _, createdAt, updatedAt, ...updateData } = studentData;
    const student = await prisma.students.update({
      where: { id },
      data: updateData,
    });
    return student;
  } catch (error: unknown) {
    console.error("Error updating student:", error);
    return "Failed to update student";
  }
};

export const deleteStudent = async (id: string) => {
  try {
    await prisma.students.delete({
      where: { id },
    });
    return true;
  } catch (error: unknown) {
    console.error("Error deleting student:", error);
    return "Failed to delete student";
  }
};

export const getStudentsByLevel = async (level: Level) => {
  try {
    // Now get students by their enrollment level, not direct level field
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        level,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by level:", error);
    return "Failed to fetch students by level - Please run 'prisma generate' first";
  }
};

// Placeholder functions for new features - will work after Prisma regeneration
export const getStudentsByProject = async (projectId: string) => {
  try {
    // This will work after running prisma generate
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        projectId,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by project:", error);
    return "Failed to fetch students by project - Please run 'prisma generate' first";
  }
};

export const getStudentsByCenter = async (centerId: string) => {
  try {
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        centerId,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by center:", error);
    return "Failed to fetch students by center - Please run 'prisma generate' first";
  }
};

export const getStudentsBySemester = async (semesterId: string) => {
  try {
    const enrollments = await (prisma as any).studentEnrollments.findMany({
      where: {
        semesterId,
        isActive: true,
      },
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
      orderBy: {
        student: { name: "asc" },
      },
    });
    return enrollments;
  } catch (error: unknown) {
    console.error("Error fetching students by semester:", error);
    return "Failed to fetch students by semester - Please run 'prisma generate' first";
  }
};

export const enrollStudent = async (enrollmentData: {
  studentId: string;
  centerId: string;
  semesterId: string;
  projectId: string;
  level: Level;
}) => {
  try {
    const enrollment = await (prisma as any).studentEnrollments.create({
      data: enrollmentData,
      include: {
        student: true,
        center: true,
        project: true,
        semester: true,
      },
    });
    return enrollment;
  } catch (error: unknown) {
    console.error("Error enrolling student:", error);
    return "Failed to enroll student - Please run 'prisma generate' first";
  }
};

export const promoteStudent = async (
  studentId: string,
  newLevel: Level,
  newCenterId?: string
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // Get current active enrollment
      const currentEnrollment = await (tx as any).studentEnrollments.findFirst({
        where: {
          studentId,
          isActive: true,
        },
        include: {
          center: true,
          project: true,
          semester: true,
        },
      });

      if (!currentEnrollment) {
        throw new Error("No active enrollment found for student");
      }

      // Close current enrollment
      await (tx as any).studentEnrollments.update({
        where: { id: currentEnrollment.id },
        data: {
          isActive: false,
          promotedAt: new Date(),
        },
      });

      // Create new enrollment with promoted level
      // Note: We don't update student.level anymore since it's removed from schema
      const newEnrollment = await (tx as any).studentEnrollments.create({
        data: {
          studentId,
          centerId: newCenterId || currentEnrollment.centerId,
          semesterId: currentEnrollment.semesterId,
          projectId: currentEnrollment.projectId,
          level: newLevel,
        },
        include: {
          student: true,
          center: true,
          project: true,
          semester: true,
        },
      });

      return newEnrollment;
    });
  } catch (error: unknown) {
    console.error("Error promoting student:", error);
    return "Failed to promote student - Please run 'prisma generate' first";
  }
};

export const getStudentHistory = async (studentId: string) => {
  try {
    const history = await (prisma as any).studentEnrollments.findMany({
      where: { studentId },
      include: {
        center: true,
        project: true,
        semester: true,
      },
      orderBy: { enrolledAt: "desc" },
    });
    return history;
  } catch (error: unknown) {
    console.error("Error fetching student history:", error);
    return "Failed to fetch student history - Please run 'prisma generate' first";
  }
};

// User Role Assignment Management Functions

// Validation helper functions
export const validateRoleAssignmentHierarchy = async (assignmentData: {
  projectId?: string;
  centerId?: string;
  semesterId?: string;
}) => {
  try {
    const { projectId, centerId, semesterId } = assignmentData;

    // If semester is provided, validate it belongs to the center
    if (semesterId && centerId) {
      const semester = await prisma.semesters.findFirst({
        where: {
          id: semesterId,
          centerId: centerId,
        },
      });

      if (!semester) {
        return {
          isValid: false,
          error: "Semester does not belong to the specified center",
        };
      }
    }

    // If center is provided, validate it belongs to the project
    if (centerId && projectId) {
      const center = await prisma.centers.findFirst({
        where: {
          id: centerId,
          projectId: projectId,
        },
      });

      if (!center) {
        return {
          isValid: false,
          error: "Center does not belong to the specified project",
        };
      }
    }

    // If semester is provided but no center, get the center from semester
    if (semesterId && !centerId) {
      const semester = await prisma.semesters.findUnique({
        where: { id: semesterId },
        include: { center: true },
      });

      if (!semester) {
        return {
          isValid: false,
          error: "Semester not found",
        };
      }

      // If project is also provided, validate semester's center belongs to project
      if (projectId && semester.center.projectId !== projectId) {
        return {
          isValid: false,
          error: "Semester's center does not belong to the specified project",
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error("Error validating role assignment hierarchy:", error);
    return {
      isValid: false,
      error: "Failed to validate assignment hierarchy",
    };
  }
};

export const createUserRoleAssignment = async (assignmentData: {
  userId: string;
  subRole: any; // SubRole enum
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  level?: any; // Level enum
  committedDays?: any; // CommittedDays enum
}) => {
  try {
    // Validate hierarchy relationships
    const validation = await validateRoleAssignmentHierarchy({
      projectId: assignmentData.projectId,
      centerId: assignmentData.centerId,
      semesterId: assignmentData.semesterId,
    });

    if (!validation.isValid) {
      return `Validation error: ${validation.error}`;
    }

    const assignment = await (prisma as any).userRoleAssignments.create({
      data: assignmentData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
      },
    });
    return assignment;
  } catch (error: unknown) {
    console.error("Error creating user role assignment:", error);
    return "Failed to create user role assignment - Please run 'prisma generate' first";
  }
};

export const getUserRoleAssignments = async (userId: string) => {
  try {
    const assignments = await (prisma as any).userRoleAssignments.findMany({
      where: { userId, isActive: true },
      include: {
        project: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    return assignments;
  } catch (error: unknown) {
    console.error("Error fetching user role assignments:", error);
    return "Failed to fetch user role assignments - Please run 'prisma generate' first";
  }
};

export const updateUserRoleAssignment = async (
  assignmentId: string,
  updateData: any
) => {
  try {
    const assignment = await (prisma as any).userRoleAssignments.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
      },
    });
    return assignment;
  } catch (error: unknown) {
    console.error("Error updating user role assignment:", error);
    return "Failed to update user role assignment - Please run 'prisma generate' first";
  }
};

export const deleteUserRoleAssignment = async (assignmentId: string) => {
  try {
    await (prisma as any).userRoleAssignments.update({
      where: { id: assignmentId },
      data: { isActive: false },
    });
    return true;
  } catch (error: unknown) {
    console.error("Error deleting user role assignment:", error);
    return "Failed to delete user role assignment - Please run 'prisma generate' first";
  }
};

export const getAllUsersWithAssignments = async () => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roleAssignments: {
          where: { isActive: true },
          include: {
            project: { select: { id: true, name: true } },
            center: { select: { id: true, name: true } },
            semester: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return users;
  } catch (error: unknown) {
    console.error("Error fetching all users with assignments:", error);
    return "Failed to fetch users with assignments";
  }
};

export const bulkUpdateUserAssignments = async (
  userId: string,
  newAssignments: Array<{
    subRole: any;
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    level?: any;
    committedDays?: any;
  }>
): Promise<any> => {
  try {
    // Validate all assignments before processing
    for (const assignment of newAssignments) {
      const validation = await validateRoleAssignmentHierarchy({
        projectId: assignment.projectId,
        centerId: assignment.centerId,
        semesterId: assignment.semesterId,
      });

      if (!validation.isValid) {
        return `Validation error for assignment: ${validation.error}`;
      }
    }

    // Check for exact duplicates in the new assignments array
    const assignmentKeys = new Set();
    for (const assignment of newAssignments) {
      const key = `${assignment.subRole}-${assignment.projectId || "null"}-${
        assignment.centerId || "null"
      }-${assignment.semesterId || "null"}`;
      if (assignmentKeys.has(key)) {
        console.warn(
          `Duplicate assignment detected and will be skipped: ${key}`
        );
        // Remove duplicates by filtering the array
        const filteredAssignments = [];
        const seenKeys = new Set();
        for (const assign of newAssignments) {
          const assignKey = `${assign.subRole}-${assign.projectId || "null"}-${
            assign.centerId || "null"
          }-${assign.semesterId || "null"}`;
          if (!seenKeys.has(assignKey)) {
            seenKeys.add(assignKey);
            filteredAssignments.push(assign);
          }
        }
        return await bulkUpdateUserAssignments(userId, filteredAssignments);
      }
      assignmentKeys.add(key);
    }

    return await prisma.$transaction(async (tx) => {
      // Deactivate all current assignments
      await (tx as any).userRoleAssignments.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      // Create new assignments
      const createdAssignments = [];
      for (const assignment of newAssignments) {
        const created = await (tx as any).userRoleAssignments.create({
          data: {
            userId,
            ...assignment,
          },
          include: {
            project: { select: { id: true, name: true } },
            center: { select: { id: true, name: true } },
            semester: { select: { id: true, name: true } },
          },
        });
        createdAssignments.push(created);
      }

      return createdAssignments;
    });
  } catch (error: unknown) {
    console.error("Error bulk updating user assignments:", error);
    return "Failed to bulk update user assignments - Please run 'prisma generate' first";
  }
};

// Role-based access functions for projects, centers, semesters

export const getUserAccessibleProjects = async (
  userId: string,
  role: string
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all projects
      const projects = await prisma.projects.findMany({
        orderBy: { createdAt: "desc" },
      });
      return projects;
    } else {
      // USER role - get only projects they're assigned to
      const userAssignments = await (
        prisma as any
      ).userRoleAssignments.findMany({
        where: { userId, isActive: true, projectId: { not: null } },
        include: {
          project: true,
        },
        distinct: ["projectId"],
      });

      const projects = userAssignments
        .map((assignment: any) => assignment.project)
        .filter(Boolean);
      return projects;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible projects:", error);
    return "Failed to fetch accessible projects";
  }
};

export const getUserAccessibleCenters = async (
  userId: string,
  role: string,
  projectId?: string
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all centers, optionally filtered by project
      const whereClause = projectId ? { projectId } : {};
      const centers = await prisma.centers.findMany({
        where: whereClause,
        include: {
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return centers;
    } else {
      // USER role - get only centers they're assigned to
      const whereClause: any = {
        userId,
        isActive: true,
        centerId: { not: null },
      };
      if (projectId) {
        whereClause.projectId = projectId;
      }

      const userAssignments = await (
        prisma as any
      ).userRoleAssignments.findMany({
        where: whereClause,
        include: {
          center: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
        },
        distinct: ["centerId"],
      });

      const centers = userAssignments
        .map((assignment: any) => assignment.center)
        .filter(Boolean);
      return centers;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible centers:", error);
    return "Failed to fetch accessible centers";
  }
};

export const getUserAccessibleSemesters = async (
  userId: string,
  role: string,
  centerId?: string
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all semesters, optionally filtered by center
      const whereClause = centerId ? { centerId } : {};
      const semesters = await prisma.semesters.findMany({
        where: whereClause,
        include: {
          center: {
            include: {
              project: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return semesters;
    } else {
      // USER role - get only semesters they're assigned to
      const whereClause: any = {
        userId,
        isActive: true,
        semesterId: { not: null },
      };
      if (centerId) {
        whereClause.centerId = centerId;
      }

      const userAssignments = await (
        prisma as any
      ).userRoleAssignments.findMany({
        where: whereClause,
        include: {
          semester: {
            include: {
              center: {
                include: {
                  project: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        distinct: ["semesterId"],
      });

      const semesters = userAssignments
        .map((assignment: any) => assignment.semester)
        .filter(Boolean);
      return semesters;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible semesters:", error);
    return "Failed to fetch accessible semesters";
  }
};

export const getUserAccessibleStudents = async (
  userId: string,
  role: string,
  filters?: {
    projectId?: string;
    centerId?: string;
    semesterId?: string;
    level?: string;
  }
) => {
  try {
    if (role === "ADMIN") {
      // Admin can access all students with optional filters
      let whereClause: any = { isActive: true };

      if (filters?.projectId) whereClause.projectId = filters.projectId;
      if (filters?.centerId) whereClause.centerId = filters.centerId;
      if (filters?.semesterId) whereClause.semesterId = filters.semesterId;
      if (filters?.level) whereClause.level = filters.level;

      const enrollments = await (prisma as any).studentEnrollments.findMany({
        where: whereClause,
        include: {
          student: true,
          center: true,
          project: true,
          semester: true,
        },
        orderBy: {
          student: { name: "asc" },
        },
      });
      return enrollments;
    } else {
      // USER role - get only students from centers/projects/semesters they're assigned to
      const userAssignments = await (
        prisma as any
      ).userRoleAssignments.findMany({
        where: { userId, isActive: true },
        select: { projectId: true, centerId: true, semesterId: true },
      });

      if (userAssignments.length === 0) {
        return [];
      }

      // Build OR conditions for each assignment context
      const orConditions = userAssignments.map((assignment: any) => {
        const condition: any = { isActive: true };
        if (assignment.projectId) condition.projectId = assignment.projectId;
        if (assignment.centerId) condition.centerId = assignment.centerId;
        if (assignment.semesterId) condition.semesterId = assignment.semesterId;
        return condition;
      });

      let whereClause: any = {
        OR: orConditions,
      };

      // Apply additional filters if provided
      if (filters?.projectId) whereClause.projectId = filters.projectId;
      if (filters?.centerId) whereClause.centerId = filters.centerId;
      if (filters?.semesterId) whereClause.semesterId = filters.semesterId;
      if (filters?.level) whereClause.level = filters.level;

      const enrollments = await (prisma as any).studentEnrollments.findMany({
        where: whereClause,
        include: {
          student: true,
          center: true,
          project: true,
          semester: true,
        },
        orderBy: {
          student: { name: "asc" },
        },
      });
      return enrollments;
    }
  } catch (error: unknown) {
    console.error("Error fetching user accessible students:", error);
    return "Failed to fetch accessible students";
  }
};
