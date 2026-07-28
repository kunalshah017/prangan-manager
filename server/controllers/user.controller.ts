import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import {
  createUser,
  getUserByEmail,
  getAdminUserById,
  getUserById,
  getContextStaff,
  getSemesterUsers,
  getRemunerationUsers,
  updateUser,
  getUnverifiedUsers,
  createStudent,
  getAllStudents,
  getStudentById,
  getStudentActiveEnrollmentScopes,
  updateStudent,
  deleteStudent,
  getStudentsByLevel,
  getStudentsBySemesterLevel,
  getStudentsByProject,
  getStudentsByCenter,
  getStudentsBySemester,
  enrollStudent,
  createEnrollment,
  getStudentEnrollments,
  updateEnrollment,
  deleteEnrollment,
  createUserRoleAssignment,
  getActiveUserScopeAssignments,
  getUserRoleAssignments,
  updateUserRoleAssignment,
  deleteUserRoleAssignment,
  getAllUsersWithAssignments,
  bulkUpdateUserAssignments,
  getUserAccessibleStudents,
  resolveEffectiveEnrollmentContext,
  validateEnrollmentHierarchy,
  updateSemesterRemunerationRates,
  setSemesterRemunerationPeriod,
  updateSemesterUserAssignments,
} from "../service/user.service.js";
import type { EnrollmentScope } from "../service/user.service.js";
import { getProjectById } from "../service/project.service.js";
import { getCenterById } from "../service/center.service.js";
import { getSemesterById } from "../service/semester.service.js";
import type { UserRegistrationRequest } from "../types/user.types.js";
import bcryptjs from "bcryptjs";
import {
  UserStatus,
  Level,
  Role,
  SubRole,
  CommittedDays,
  AccountTokenType,
} from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import {
  parseLegacyPersonName,
  resolvePersonNameCreate,
  resolvePersonNameUpdate,
} from "../lib/person-name.js";
import {
  convertToDateTime,
  isValidDateFormat,
  isValidISOFormat,
} from "../utils/dateHelpers.js";
import { updateUserBankDetails } from "../service/user.service.js";
import { canAccessScope, isAdmin } from "../security/authorization.js";
import {
  canManageStudentProfile,
  canReadStudentEnrollment,
} from "../security/student-authorization.js";
import { extractGeneralUserUpdate } from "../security/user-update.js";
import { parseRemunerationPeriodInput } from "../security/remuneration-input.js";
import {
  CSRF_COOKIE_NAME,
  createSessionToken,
  getAllowedClientOrigin,
  getCsrfCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "../security/session.js";
import {
  consumeAccountTokenAndSetPassword,
  createAccountTokenRecordInTransaction,
  createAccountTokenInTransaction,
} from "../service/account-token.service.js";
import { AcademicLevelServiceError } from "../service/academic-level.service.js";
import { resolveSemesterLevelInput } from "../service/semester-level.service.js";
import { enqueueEmail } from "../service/email-queue.service.js";
import {
  EMAIL_JOB_COMMITTED,
  emitCommitTrigger,
} from "../lib/commit-triggers.js";
import {
  buildPasswordResetEmailJob,
  buildRegistrationApprovalEmailJob,
  buildRegistrationRejectionEmailJob,
} from "../email/account-email.js";

const getStudentScopeAssignments = async (
  user: NonNullable<FastifyRequest["user"]>,
) => (isAdmin(user) ? [] : getActiveUserScopeAssignments(user.id));

const getAccessibleStudentEnrollmentScopes = async ({
  user,
  studentId,
  policy,
}: {
  user: NonNullable<FastifyRequest["user"]>;
  studentId: string;
  policy: typeof canReadStudentEnrollment | typeof canManageStudentProfile;
}) => {
  const [assignments, scopes] = await Promise.all([
    getStudentScopeAssignments(user),
    isAdmin(user)
      ? Promise.resolve([])
      : getStudentActiveEnrollmentScopes(studentId),
  ]);

  if (typeof assignments === "string") return "assignments" as const;
  if (isAdmin(user)) return undefined;
  return scopes.filter((scope): scope is EnrollmentScope =>
    policy({ identity: user, assignments, scope }),
  );
};

// Update current user's bank details
export const updateMyBankDetails = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) return errorHandle("Unauthorized", reply, 401);

    const body = request.body as {
      bankAccountNumber?: string;
      bankAccountName?: string;
      bankIfsc?: string;
      bankName?: string;
      bankBranch?: string;
      upiId?: string;
    };

    // Basic validation (optional fields; when present, trim and validate)
    const cleaned = {
      bankAccountNumber: body?.bankAccountNumber?.trim() || null,
      bankAccountName: body?.bankAccountName?.trim() || null,
      bankIfsc: body?.bankIfsc?.trim().toUpperCase() || null,
      bankName: body?.bankName?.trim() || null,
      bankBranch: body?.bankBranch?.trim() || null,
      upiId: body?.upiId?.trim() || null,
    };

    if (cleaned.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleaned.bankIfsc)) {
      return errorHandle("Invalid IFSC code format.", reply, 400);
    }

    const result = await updateUserBankDetails(authUser.id, cleaned);
    if (typeof result === "string") return errorHandle(result, reply, 500);

    return successHandle(
      {
        message: "Bank details updated successfully",
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          firstName: result.firstName,
          middleName: result.middleName,
          lastName: result.lastName,
          profileImageUrl: result.profileImageUrl,
          role: result.role,
          status: result.status,
          phone: result.phone,
          qualification: result.qualification,
          address: result.address,
          dob: result.dob,
          reimbursementAmount: (result as any).reimbursementAmount ?? null,
          bankAccountNumber: result.bankAccountNumber,
          bankAccountName: result.bankAccountName,
          bankIfsc: result.bankIfsc,
          bankName: result.bankName,
          bankBranch: result.bankBranch,
          upiId: (result as any).upiId ?? null,
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
        },
      },
      reply,
      200,
    );
  },
);

export const registerUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as UserRegistrationRequest;

    if (!data.email) {
      return errorHandle("Email is required.", reply, 400);
    }

    let resolvedName;
    try {
      resolvedName = resolvePersonNameCreate(data);
    } catch (error) {
      return errorHandle((error as Error).message, reply, 400);
    }

    // Validate DOB if provided
    let dobDate: Date | null = null;
    if (data.dob) {
      if (!isValidDateFormat(data.dob) && !isValidISOFormat(data.dob)) {
        return errorHandle(
          "Invalid date format. Please use YYYY-MM-DD or ISO format.",
          reply,
          400,
        );
      }

      dobDate = convertToDateTime(data.dob) ?? null;
      if (!dobDate) {
        return errorHandle(
          "Invalid date provided for date of birth.",
          reply,
          400,
        );
      }

      // Validate DOB is not in the future
      if (dobDate > new Date()) {
        return errorHandle(
          "Date of birth cannot be in the future.",
          reply,
          400,
        );
      }

      // Validate reasonable age (between 5 and 120 years)
      const age = new Date().getFullYear() - dobDate.getFullYear();
      if (age < 5 || age > 120) {
        return errorHandle("Please provide a valid date of birth.", reply, 400);
      }
    }

    const [checkUser, hashedPassword] = await Promise.all([
      getUserByEmail(data.email),
      bcryptjs.hash("pending-account-password", 10),
    ]);

    if (checkUser) {
      return errorHandle("User already exists with this email.", reply, 400);
    }

    const userData = {
      ...resolvedName,
      email: data.email,
      dob: dobDate,
      password: hashedPassword,
      role: Role.USER, // Use Prisma enum
      phone: data.phone || null,
      qualification: data.qualification || null,
      address: data.address || null,
      profileImageUrl: data.profileImageUrl || null,
      status: UserStatus.PENDING, // Use Prisma enum
      bankAccountNumber: null,
      bankAccountName: null,
      bankIfsc: null,
      bankName: null,
      bankBranch: null,
      upiId: null,
    };

    const user = await createUser(userData);

    if (typeof user === "string") {
      return errorHandle(user, reply, 500);
    }

    return successHandle(
      { message: "User registered successfully" },
      reply,
      201,
    );
  },
);

export const loginUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as { email: string; password: string };

    if (!data.email || !data.password) {
      return errorHandle("Email and password are required.", reply, 400);
    }

    const user = await getUserByEmail(data.email);

    if (!user || typeof user === "string") {
      return errorHandle("User not found.", reply, 404);
    }

    // Check if user is approved
    if (user.status !== UserStatus.APPROVED) {
      return errorHandle(
        "Your account is pending approval. Please contact an administrator.",
        reply,
        403,
      );
    }

    const isPasswordValid = await bcryptjs.compare(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      return errorHandle("Invalid password.", reply, 401);
    }

    const token = createSessionToken(user.id, user.sessionVersion);

    // Fetch full user details with role assignments for response
    const fullUserDetails = await getUserById(user.id);

    reply.setCookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

    return successHandle(
      { message: "Login successful", user: fullUserDetails },
      reply,
      200,
    );
  },
);

export const logoutUser = asyncHandle(
  async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    reply.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
    return successHandle({ message: "Logged out" }, reply, 200);
  },
);

export const getCurrentUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user) {
      return errorHandle("User not found in request.", reply, 401);
    }

    const fullUserDetails = await getUserById(user.id);

    if (!fullUserDetails || typeof fullUserDetails === "string") {
      return errorHandle("User not found.", reply, 404);
    }

    return successHandle(
      {
        message: "User details retrieved successfully",
        user: fullUserDetails,
      },
      reply,
      200,
    );
  },
);

type RegistrationRoleAssignment = {
  subRole: string;
  projectId?: string;
  centerId?: string;
  semesterId?: string;
  semesterLevelId?: string;
  level?: string;
  committedDays?: string;
};

const buildRegistrationRoleDetails = async (
  assignments: RegistrationRoleAssignment[],
) => {
  if (assignments.length === 0) return "";
  const roleNames: Record<string, string> = {
    TRAINING_DEVELOPMENT: "Training & Development",
    RECRUITMENT: "Recruitment",
    GROWTH_DEVELOPMENT: "Growth & Development",
    CURRICULUM_MENTOR: "Curriculum Mentor",
    TECH: "Technology",
    CENTER_MANAGER: "Center Manager",
    EDUCATOR: "Educator",
  };

  const details = await Promise.all(
    assignments.map(async (assignment) => {
      const roleName =
        roleNames[assignment.subRole] ||
        assignment.subRole.replace(/_/g, " ");
      let detail = `<div class="role-assignment"><h4>🎯 ${roleName}</h4>`;

      if (assignment.projectId) {
        const project = await getProjectById(assignment.projectId);
        if (project && typeof project !== "string") {
          detail += `<p><strong>📋 Project:</strong> ${project.name}</p>`;
        }
      }
      if (assignment.centerId) {
        const center = await getCenterById(assignment.centerId);
        if (center && typeof center !== "string") {
          detail += `<p><strong>🏢 Center:</strong> ${center.name}</p>`;
        }
      }
      if (assignment.semesterId) {
        const semester = await getSemesterById(assignment.semesterId);
        if (semester && typeof semester !== "string") {
          const startDate = new Date(semester.startDate).toLocaleDateString();
          const endDate = new Date(semester.endDate).toLocaleDateString();
          detail += `<p><strong>📅 Semester:</strong> ${semester.name} (${startDate} - ${endDate})</p>`;
        }
      }
      if (assignment.level && assignment.subRole === "EDUCATOR") {
        detail += `<p><strong>📚 Teaching Level:</strong> ${assignment.level.replace(/_/g, " ")}</p>`;
      }
      if (
        assignment.committedDays &&
        ["CENTER_MANAGER", "EDUCATOR"].includes(assignment.subRole)
      ) {
        const days =
          assignment.committedDays === "BOTH"
            ? "Saturday & Sunday"
            : assignment.committedDays === "SATURDAY"
              ? "Saturday"
              : "Sunday";
        detail += `<p><strong>📅 Committed Days:</strong> ${days}</p>`;
      }
      return `${detail}</div>`;
    }),
  );
  const count = assignments.length;
  return `<div class="credentials">
    <h3>👥 Your Role Assignments</h3>
    <p>${
      count === 1
        ? "You have been assigned the following position:"
        : `You have been assigned the following ${count} positions:`
    }</p>
    ${details.join("")}
    <p style="margin-top: 15px; font-style: italic; color: #666;">
      ${
        count === 1 ? "This position comes" : "These positions come"
      } with specific responsibilities and access levels within the Prangan Foundation system.
    </p>
  </div>`;
};

export const verifyUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle("Unauthorized access.", reply, 403);
    }

    const data = request.body as {
      status: UserStatus;
      role: Role;
      userId: string;
      rejectionReason?: string;
      roleAssignments?: RegistrationRoleAssignment[];
    };
    if (!data.userId || !data.status || !data.role) {
      return errorHandle("User ID, status, and role are required.", reply, 400);
    }
    if (
      data.status !== UserStatus.APPROVED &&
      data.status !== UserStatus.REJECTED
    ) {
      return errorHandle("Invalid registration decision.", reply, 400);
    }
    if (!Object.values(Role).includes(data.role)) {
      return errorHandle("Invalid role provided.", reply, 400);
    }

    const notificationUser = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { email: true, name: true, status: true },
    });
    if (!notificationUser) {
      return errorHandle("User not found.", reply, 404);
    }
    if (notificationUser.status !== UserStatus.PENDING) {
      return errorHandle(
        "This registration request has already been reviewed.",
        reply,
        409,
      );
    }

    if (data.status === UserStatus.REJECTED) {
      const rejectionReason =
        data.rejectionReason ||
        "No specific reason was provided. Please contact an administrator for more details.";
      try {
        const rejected = await prisma.$transaction(async (tx) => {
          const deleted = await tx.user.deleteMany({
            where: { id: data.userId, status: UserStatus.PENDING },
          });
          if (deleted.count !== 1) return false;
          const emailJob = buildRegistrationRejectionEmailJob({
            userId: data.userId,
            email: notificationUser.email,
            name: notificationUser.name,
            rejectionReason,
          });
          await enqueueEmail(emailJob, tx);
          return true;
        });
        if (!rejected) {
          return errorHandle(
            "This registration request has already been reviewed.",
            reply,
            409,
          );
        }
        emitCommitTrigger(EMAIL_JOB_COMMITTED);
        return successHandle(
          {
            message:
              "User rejected and removed from the system. Rejection email queued.",
            action: "rejected_and_deleted",
          },
          reply,
          200,
        );
      } catch (error) {
        console.error("Failed to process user rejection:", error);
        return errorHandle("Failed to process user rejection.", reply, 500);
      }
    }

    const assignments =
      data.role === Role.USER ? data.roleAssignments ?? [] : [];
    for (const assignment of assignments) {
      if (!assignment.subRole) {
        return errorHandle(
          "SubRole is required for each role assignment.",
          reply,
          400,
        );
      }
      if (assignment.level && assignment.subRole !== "EDUCATOR") {
        return errorHandle(
          "Level can only be assigned to EDUCATOR sub-role.",
          reply,
          400,
        );
      }
      if (
        assignment.committedDays &&
        !["CENTER_MANAGER", "EDUCATOR"].includes(assignment.subRole)
      ) {
        return errorHandle(
          "CommittedDays can only be assigned to CENTER_MANAGER or EDUCATOR sub-roles.",
          reply,
          400,
        );
      }
    }

    const seenKeys = new Set<string>();
    const uniqueAssignments = assignments.filter((assignment) => {
      const key = [
        assignment.subRole,
        assignment.projectId ?? "",
        assignment.centerId ?? "",
        assignment.semesterId ?? "",
      ].join("|");
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });
    let roleAssignmentDetails = "";
    try {
      roleAssignmentDetails =
        await buildRegistrationRoleDetails(uniqueAssignments);
    } catch (error) {
      console.error("Failed to prepare role assignment email details:", error);
    }

    try {
      const transactionResult = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id: data.userId, status: UserStatus.PENDING },
          data: { status: UserStatus.APPROVED, role: data.role },
        });
        if (updated.count !== 1) return null;

        const userUpdate = await tx.user.findUnique({
          where: { id: data.userId },
        });
        if (!userUpdate) return null;

        const activationToken = await createAccountTokenInTransaction(
          tx,
          data.userId,
          AccountTokenType.ACTIVATION,
        );
        let assignmentsResult = null;
        if (uniqueAssignments.length > 0) {
          await tx.userRoleAssignments.updateMany({
            where: { userId: data.userId, isActive: true },
            data: { isActive: false },
          });
          const createdAssignments = [];
          for (const assignment of uniqueAssignments) {
            const semesterLevel =
              assignment.subRole === "EDUCATOR"
                ? await resolveSemesterLevelInput({
                    semesterId: assignment.semesterId,
                    semesterLevelId: assignment.semesterLevelId,
                    level: assignment.level,
                  })
                : null;
            createdAssignments.push(
              await tx.userRoleAssignments.create({
                data: {
                  userId: data.userId,
                  subRole: assignment.subRole as SubRole,
                  projectId: assignment.projectId || null,
                  centerId: assignment.centerId || null,
                  semesterId: assignment.semesterId || null,
                  semesterLevelId: semesterLevel?.id || null,
                  level: semesterLevel?.academicLevel.code ?? null,
                  committedDays: assignment.committedDays
                    ? (assignment.committedDays as CommittedDays)
                    : null,
                },
                include: {
                  project: { select: { id: true, name: true } },
                  center: { select: { id: true, name: true } },
                  semester: { select: { id: true, name: true } },
                  semesterLevel: { include: { academicLevel: true } },
                },
              }),
            );
          }
          assignmentsResult = createdAssignments;
        }

        const emailJob = buildRegistrationApprovalEmailJob({
          userId: userUpdate.id,
          email: userUpdate.email,
          name: userUpdate.name,
          activationUrl: `${getAllowedClientOrigin()}/activate?token=${encodeURIComponent(activationToken)}`,
          roleAssignmentDetails,
        });
        await enqueueEmail(emailJob, tx);
        return { userUpdate, assignmentsResult };
      });
      if (!transactionResult) {
        return errorHandle(
          "This registration request has already been reviewed.",
          reply,
          409,
        );
      }

      emitCommitTrigger(EMAIL_JOB_COMMITTED);
      const fullUserDetails = await getAdminUserById(
        transactionResult.userUpdate.id,
      );
      return successHandle(
        {
          message:
            "User verification completed successfully and notification email queued.",
          user: fullUserDetails,
          roleAssignments: transactionResult.assignmentsResult,
        },
        reply,
        200,
      );
    } catch (error) {
      console.error("User approval transaction failed:", error);
      return errorHandle("Database operation failed.", reply, 500);
    }
  },
);

const isPassword = (value: unknown): value is string =>
  typeof value === "string" && value.length >= 12;

export const activateAccount = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { token?: unknown; password?: unknown };
    if (typeof body?.token !== "string" || !isPassword(body.password)) {
      return errorHandle(
        "A valid token and password are required.",
        reply,
        400,
      );
    }

    const activated = await consumeAccountTokenAndSetPassword({
      rawToken: body.token,
      type: AccountTokenType.ACTIVATION,
      password: body.password,
    });
    if (!activated)
      return errorHandle("Activation link is invalid or expired.", reply, 400);

    return successHandle(
      { message: "Account activated. Please sign in." },
      reply,
      200,
    );
  },
);

export const requestPasswordReset = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { email?: unknown };
    const message =
      "If that account exists, a password reset email has been queued.";
    if (typeof body?.email !== "string")
      return successHandle({ message }, reply, 200);

    const user = await getUserByEmail(body.email);
    if (
      user &&
      typeof user !== "string" &&
      user.status === UserStatus.APPROVED
    ) {
      try {
        await prisma.$transaction(async (tx) => {
          const token = await createAccountTokenRecordInTransaction(
            tx,
            user.id,
            AccountTokenType.PASSWORD_RESET,
          );
          const emailJob = buildPasswordResetEmailJob({
            accountTokenId: token.id,
            email: user.email,
            name: user.name,
            resetUrl: `${getAllowedClientOrigin()}/reset-password?token=${encodeURIComponent(token.rawToken)}`,
          });
          await enqueueEmail(emailJob, tx);
        });
        emitCommitTrigger(EMAIL_JOB_COMMITTED);
      } catch (error) {
        console.error("Password reset queue failed:", error);
      }
    }

    return successHandle({ message }, reply, 200);
  },
);

export const completePasswordReset = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { token?: unknown; password?: unknown };
    if (typeof body?.token !== "string" || !isPassword(body.password)) {
      return errorHandle(
        "A valid token and password are required.",
        reply,
        400,
      );
    }

    const reset = await consumeAccountTokenAndSetPassword({
      rawToken: body.token,
      type: AccountTokenType.PASSWORD_RESET,
      password: body.password,
    });
    if (!reset)
      return errorHandle("Reset link is invalid or expired.", reply, 400);

    return successHandle(
      { message: "Password reset. Please sign in." },
      reply,
      200,
    );
  },
);

/**
 * Revocation is deliberately separate from registration rejection: approved
 * accounts remain in the audit trail, while their current portal access and
 * active scope assignments are withdrawn in one transaction.
 */
export const revokeUserAccessController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle("Only admins can revoke portal access.", reply, 403);
    }

    const { userId } = request.params as { userId: string };
    if (!userId) return errorHandle("User ID is required.", reply, 400);
    if (admin.id === userId) {
      return errorHandle("You cannot revoke your own portal access.", reply, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      });
      if (!user) return null;

      await tx.userRoleAssignments.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.REJECTED,
          sessionVersion: { increment: 1 },
        },
      });
      return user;
    });

    if (!result) return errorHandle("User not found.", reply, 404);
    return successHandle(
      {
        message: "Portal access revoked and active role assignments removed.",
      },
      reply,
      200,
    );
  },
);

export const GetUnverifiedUsers = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle("Unauthorized access.", reply, 403);
    }

    const unverifiedUsers = await getUnverifiedUsers();
    if (typeof unverifiedUsers === "string") {
      return errorHandle("Failed to fetch unverified users.", reply, 500);
    }

    return successHandle(
      {
        message: "Unverified users retrieved successfully",
        users: unverifiedUsers,
      },
      reply,
      200,
    );
  },
);

// Student Controllers
export const addStudent = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const data = request.body as {
      name?: string;
      firstName?: string;
      middleName?: string | null;
      lastName?: string | null;
      dob?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      alternateNumber?: string;
      profileImageUrl?: string;
      fatherName?: string;
      motherName?: string;
      address?: string;
      schoolName?: string;
      fatherOccupation?: string;
      motherOccupation?: string;
      familyIncome?: string;
      futureProfession?: string;
      enrollment?: {
        centerId: string;
        semesterId: string;
        projectId: string;
        semesterLevelId?: string;
        level?: Level;
      };
    };
    let resolvedEnrollment:
      | {
          centerId: string;
          semesterId: string;
          projectId: string;
          semesterLevelId: string;
          level: Level;
        }
      | undefined;

    let resolvedName;
    try {
      resolvedName = resolvePersonNameCreate(data);
    } catch (error) {
      return errorHandle((error as Error).message, reply, 400);
    }

    if (!data.enrollment && !isAdmin(user)) {
      return errorHandle(
        "Only admins can create students without an enrollment.",
        reply,
        403,
      );
    }

    // Validate enrollment data if provided
    if (data.enrollment) {
      if (
        !data.enrollment.centerId ||
        !data.enrollment.semesterId ||
        !data.enrollment.projectId ||
        (!data.enrollment.semesterLevelId && !data.enrollment.level)
      ) {
        return errorHandle(
          "All enrollment fields (centerId, semesterId, projectId, and semesterLevelId or level) are required when enrollment is provided.",
          reply,
          400,
        );
      }

      // Validate level enum
      if (
        data.enrollment.level &&
        !Object.values(Level).includes(data.enrollment.level)
      ) {
        return errorHandle("Invalid level provided in enrollment.", reply, 400);
      }

      const assignments = await getStudentScopeAssignments(user);
      if (typeof assignments === "string") {
        return errorHandle(
          "Unable to verify student creation access.",
          reply,
          500,
        );
      }
      if (
        !canManageStudentProfile({
          identity: user,
          assignments,
          scope: data.enrollment,
        })
      ) {
        return errorHandle(
          "You are not authorized to create a student in this scope.",
          reply,
          403,
        );
      }

      const validation = await validateEnrollmentHierarchy(data.enrollment);
      if (validation !== true) {
        return errorHandle(validation, reply, 400);
      }

      try {
        const semesterLevel = await resolveSemesterLevelInput(data.enrollment);
        resolvedEnrollment = {
          centerId: data.enrollment.centerId,
          semesterId: data.enrollment.semesterId,
          projectId: data.enrollment.projectId,
          semesterLevelId: semesterLevel.id,
          level: semesterLevel.academicLevel.code as Level,
        };
      } catch (error) {
        if (error instanceof AcademicLevelServiceError) {
          return errorHandle(error.message, reply, error.statusCode);
        }
        throw error;
      }
    }

    // Validate DOB if provided
    let dobDate: Date | null = null;
    if (data.dob) {
      if (!isValidDateFormat(data.dob) && !isValidISOFormat(data.dob)) {
        return errorHandle(
          "Invalid date format for DOB. Please use YYYY-MM-DD or ISO format.",
          reply,
          400,
        );
      }

      dobDate = convertToDateTime(data.dob) ?? null;
      if (!dobDate) {
        return errorHandle(
          "Invalid date provided for date of birth.",
          reply,
          400,
        );
      }

      // Validate DOB is not in the future
      if (dobDate > new Date()) {
        return errorHandle(
          "Date of birth cannot be in the future.",
          reply,
          400,
        );
      }

      // Validate reasonable age for students (between 3 and 25 years)
      const age = new Date().getFullYear() - dobDate.getFullYear();
      if (age < 3 || age > 25) {
        return errorHandle(
          "Please provide a valid date of birth for the student.",
          reply,
          400,
        );
      }
    }

    const studentData = {
      ...resolvedName,
      dob: dobDate,
      phoneNumber: data.phoneNumber || null,
      whatsappNumber: data.whatsappNumber || null,
      alternateNumber: data.alternateNumber || null,
      profileImageUrl: data.profileImageUrl || null,
      fatherName: data.fatherName || null,
      motherName: data.motherName || null,
      address: data.address || null,
      schoolName: data.schoolName || null,
      fatherOccupation: data.fatherOccupation || null,
      motherOccupation: data.motherOccupation || null,
      familyIncome: data.familyIncome || null,
      futureProfession: data.futureProfession || null,
      enrollments: resolvedEnrollment ? [resolvedEnrollment] : undefined,
    };

    const student = await createStudent(studentData);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
    }

    const enrollment = data.enrollment
      ? ((student as { enrollments?: unknown[] }).enrollments?.[0] ?? null)
      : null;

    const responseMessage = data.enrollment
      ? "Student added and enrolled successfully"
      : "Student added successfully. Use enrollment endpoints to assign level and center.";

    return successHandle(
      {
        message: responseMessage,
        student: student,
        enrollment: enrollment,
      },
      reply,
      201,
    );
  },
);

export const getStudents = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    // Use role-based access to get students
    const students = await getUserAccessibleStudents(user.id, user.role);

    if (typeof students === "string") {
      return errorHandle(students, reply, 500);
    }

    return successHandle(
      {
        message: "Students retrieved successfully",
        students: students,
      },
      reply,
      200,
    );
  },
);

export const getStudent = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const visibleEnrollmentScopes = await getAccessibleStudentEnrollmentScopes({
      user,
      studentId: id,
      policy: canReadStudentEnrollment,
    });
    if (visibleEnrollmentScopes === "assignments") {
      return errorHandle("Unable to verify student access.", reply, 500);
    }
    if (visibleEnrollmentScopes?.length === 0) {
      return errorHandle(
        "You are not authorized to view this student.",
        reply,
        403,
      );
    }

    const student = await getStudentById(id, visibleEnrollmentScopes);

    if (typeof student === "string") {
      return errorHandle("Unable to retrieve student.", reply, 500);
    }

    if (!student) {
      return errorHandle("Student not found.", reply, 404);
    }

    return successHandle(
      {
        message: "Student retrieved successfully",
        student: student,
      },
      reply,
      200,
    );
  },
);

export const updateStudentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { id } = request.params as { id: string };
    const data = request.body as {
      name?: string;
      firstName?: string;
      middleName?: string | null;
      lastName?: string | null;
      dob?: string;
      phoneNumber?: string;
      whatsappNumber?: string;
      alternateNumber?: string;
      profileImageUrl?: string;
      fatherName?: string;
      motherName?: string;
      address?: string;
      schoolName?: string;
      fatherOccupation?: string;
      motherOccupation?: string;
      familyIncome?: string;
      futureProfession?: string;
      enrollments?: Array<{
        centerId: string;
        semesterId: string;
        projectId: string;
        level: Level;
      }>;
      enrollment?: {
        centerId?: string;
        semesterId?: string;
        projectId?: string;
        level?: Level;
      };
    };

    if (!id) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const access = await getAccessibleStudentEnrollmentScopes({
      user,
      studentId: id,
      policy: canManageStudentProfile,
    });
    if (access === "assignments") {
      return errorHandle("Unable to verify student update access.", reply, 500);
    }
    if (access?.length === 0) {
      return errorHandle(
        "You are not authorized to update this student.",
        reply,
        403,
      );
    }

    // Validate enrollment level if provided (both single enrollment and enrollments array)
    if (
      data.enrollment?.level &&
      !Object.values(Level).includes(data.enrollment.level)
    ) {
      return errorHandle("Invalid level provided in enrollment.", reply, 400);
    }

    // Validate enrollments array if provided
    if (data.enrollments) {
      if (!Array.isArray(data.enrollments)) {
        return errorHandle("Enrollments must be an array", reply, 400);
      }

      for (const enrollment of data.enrollments) {
        if (
          !enrollment.centerId ||
          !enrollment.semesterId ||
          !enrollment.projectId ||
          !enrollment.level
        ) {
          return errorHandle(
            "Each enrollment must have centerId, semesterId, projectId, and level",
            reply,
            400,
          );
        }

        if (!Object.values(Level).includes(enrollment.level)) {
          return errorHandle(
            `Invalid level provided: ${enrollment.level}`,
            reply,
            400,
          );
        }
      }
    }

    const updateData: any = {};

    if (
      ["name", "firstName", "middleName", "lastName"].some((field) =>
        Object.prototype.hasOwnProperty.call(data, field),
      )
    ) {
      const currentStudent = await getStudentById(id);
      if (!currentStudent || typeof currentStudent === "string") {
        return errorHandle("Student not found.", reply, 404);
      }

      const currentName = currentStudent.firstName
        ? {
            firstName: currentStudent.firstName,
            middleName: currentStudent.middleName,
            lastName: currentStudent.lastName,
          }
        : parseLegacyPersonName(currentStudent.name);

      try {
        Object.assign(
          updateData,
          resolvePersonNameUpdate(data, currentName) ?? {},
        );
      } catch (error) {
        return errorHandle((error as Error).message, reply, 400);
      }
    }

    // Handle DOB update
    if (data.dob !== undefined) {
      if (data.dob === "" || data.dob === null) {
        updateData.dob = null;
      } else {
        if (!isValidDateFormat(data.dob) && !isValidISOFormat(data.dob)) {
          return errorHandle(
            "Invalid date format for DOB. Please use YYYY-MM-DD or ISO format.",
            reply,
            400,
          );
        }

        const dobDate = convertToDateTime(data.dob) ?? null;
        if (!dobDate) {
          return errorHandle(
            "Invalid date provided for date of birth.",
            reply,
            400,
          );
        }

        // Validate DOB is not in the future
        if (dobDate > new Date()) {
          return errorHandle(
            "Date of birth cannot be in the future.",
            reply,
            400,
          );
        }

        // Validate reasonable age for students (between 3 and 25 years)
        const age = new Date().getFullYear() - dobDate.getFullYear();
        if (age < 3 || age > 25) {
          return errorHandle(
            "Please provide a valid date of birth for the student.",
            reply,
            400,
          );
        }

        updateData.dob = dobDate;
      }
    }

    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber;
    if (data.whatsappNumber !== undefined)
      updateData.whatsappNumber = data.whatsappNumber;
    if (data.alternateNumber !== undefined)
      updateData.alternateNumber = data.alternateNumber;

    if (data.profileImageUrl !== undefined)
      updateData.profileImageUrl = data.profileImageUrl;

    // Update family details
    if (data.fatherName !== undefined) updateData.fatherName = data.fatherName;
    if (data.motherName !== undefined) updateData.motherName = data.motherName;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.schoolName !== undefined) updateData.schoolName = data.schoolName;
    if (data.fatherOccupation !== undefined)
      updateData.fatherOccupation = data.fatherOccupation;
    if (data.motherOccupation !== undefined)
      updateData.motherOccupation = data.motherOccupation;
    if (data.familyIncome !== undefined)
      updateData.familyIncome = data.familyIncome;
    if (data.futureProfession !== undefined)
      updateData.futureProfession = data.futureProfession;

    // Update student details only, not enrollment
    const student = await updateStudent(id, updateData);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
    }

    return successHandle(
      {
        message: "Student updated successfully",
        student: student,
      },
      reply,
      200,
    );
  },
);

export const deleteStudentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== Role.ADMIN) {
      return errorHandle("Only admins can delete students.", reply, 403);
    }

    const { id } = request.params as { id: string };

    if (!id) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const result = await deleteStudent(id);

    if (typeof result === "string") {
      if (result === "Cannot delete student while enrollments exist") {
        return errorHandle(result, reply, 409);
      }

      return errorHandle("Internal Server Error", reply, 500);
    }

    return successHandle(
      {
        message: "Student deleted successfully",
      },
      reply,
      200,
    );
  },
);

export const getStudentsByLevelController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { level } = request.params as { level: Level };

    if (!level) {
      return errorHandle("Level is required.", reply, 400);
    }

    // Validate level enum
    if (!Object.values(Level).includes(level)) {
      return errorHandle("Invalid level provided.", reply, 400);
    }

    // Use role-based access to get students by level
    const students = await getUserAccessibleStudents(user.id, user.role, {
      level,
    });

    if (typeof students === "string") {
      return errorHandle(students, reply, 500);
    }

    return successHandle(
      {
        message: "Students retrieved successfully",
        students: students,
      },
      reply,
      200,
    );
  },
);

export const getStudentsBySemesterLevelController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) return errorHandle("Unauthorized access.", reply, 401);

    const { semesterLevelId } = request.params as { semesterLevelId: string };
    if (!semesterLevelId) {
      return errorHandle("Semester level ID is required.", reply, 400);
    }

    const students = await getUserAccessibleStudents(user.id, user.role, {
      semesterLevelId,
    });
    if (typeof students === "string") {
      return errorHandle(students, reply, 500);
    }

    return successHandle(
      { message: "Students retrieved successfully", students },
      reply,
      200,
    );
  },
);

// New controllers for project, center, semester filtering
export const getStudentsByProjectController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { projectId } = request.params as { projectId: string };

    if (!projectId) {
      return errorHandle("Project ID is required.", reply, 400);
    }

    // Use role-based access to get students by project
    const enrollments = await getUserAccessibleStudents(user.id, user.role, {
      projectId,
    });

    if (typeof enrollments === "string") {
      return errorHandle(enrollments, reply, 500);
    }

    return successHandle(
      {
        message: "Students by project retrieved successfully",
        enrollments: enrollments,
      },
      reply,
      200,
    );
  },
);

export const getStudentsByCenterController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { centerId } = request.params as { centerId: string };

    if (!centerId) {
      return errorHandle("Center ID is required.", reply, 400);
    }

    // Use role-based access to get students by center
    const enrollments = await getUserAccessibleStudents(user.id, user.role, {
      centerId,
    });

    if (typeof enrollments === "string") {
      return errorHandle(enrollments, reply, 500);
    }

    return successHandle(
      {
        message: "Students by center retrieved successfully",
        enrollments: enrollments,
      },
      reply,
      200,
    );
  },
);

export const getStudentsBySemesterController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { semesterId } = request.params as { semesterId: string };

    if (!semesterId) {
      return errorHandle("Semester ID is required.", reply, 400);
    }

    // Use role-based access to get students by semester
    const enrollments = await getUserAccessibleStudents(user.id, user.role, {
      semesterId,
    });

    if (typeof enrollments === "string") {
      return errorHandle(enrollments, reply, 500);
    }

    return successHandle(
      {
        message: "Students by semester retrieved successfully",
        enrollments: enrollments,
      },
      reply,
      200,
    );
  },
);

// Keep enrollStudentController for backward compatibility
export const enrollStudentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== Role.ADMIN) {
      return errorHandle("Only admins can enroll students.", reply, 403);
    }

    const data = request.body as {
      studentId: string;
      centerId: string;
      semesterId: string;
      projectId: string;
      semesterLevelId?: string;
      level?: Level;
    };

    if (
      !data.studentId ||
      !data.centerId ||
      !data.semesterId ||
      !data.projectId ||
      (!data.semesterLevelId && !data.level)
    ) {
      return errorHandle("All enrollment fields are required.", reply, 400);
    }

    // Validate level enum
    if (data.level && !Object.values(Level).includes(data.level)) {
      return errorHandle("Invalid level provided.", reply, 400);
    }

    const validation = await validateEnrollmentHierarchy(data);
    if (validation !== true) {
      return errorHandle(validation, reply, 400);
    }

    const enrollment = await enrollStudent(data);

    if (typeof enrollment === "string") {
      return errorHandle(enrollment, reply, 500);
    }

    return successHandle(
      {
        message: "Student enrolled successfully",
        enrollment: enrollment,
      },
      reply,
      201,
    );
  },
);

// New enrollment management controllers
export const createEnrollmentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== Role.ADMIN) {
      return errorHandle("Only admins can create enrollments.", reply, 403);
    }

    const { studentId } = request.params as { studentId: string };
    const data = request.body as {
      centerId: string;
      semesterId: string;
      projectId: string;
      semesterLevelId?: string;
      level?: Level;
    };

    if (!studentId) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    if (
      !data.centerId ||
      !data.semesterId ||
      !data.projectId ||
      (!data.semesterLevelId && !data.level)
    ) {
      return errorHandle("All enrollment fields are required.", reply, 400);
    }

    // Validate level enum
    if (data.level && !Object.values(Level).includes(data.level)) {
      return errorHandle("Invalid level provided.", reply, 400);
    }

    const validation = await validateEnrollmentHierarchy(data);
    if (validation !== true) {
      return errorHandle(validation, reply, 400);
    }

    const enrollment = await createEnrollment(
      studentId,
      data.centerId,
      data.semesterId,
      data.projectId,
      data.level,
      data.semesterLevelId,
    );

    if (typeof enrollment === "string") {
      return errorHandle(enrollment, reply, 500);
    }

    return successHandle(
      {
        message:
          "Enrollment created successfully. Previous active enrollment has been deactivated.",
        enrollment: enrollment,
      },
      reply,
      201,
    );
  },
);

export const getStudentEnrollmentsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { studentId } = request.params as { studentId: string };

    if (!studentId) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const visibleEnrollmentScopes = await getAccessibleStudentEnrollmentScopes({
      user,
      studentId,
      policy: canReadStudentEnrollment,
    });
    if (visibleEnrollmentScopes === "assignments") {
      return errorHandle(
        "Unable to verify student enrollment access.",
        reply,
        500,
      );
    }
    if (visibleEnrollmentScopes?.length === 0) {
      return errorHandle(
        "You are not authorized to view these enrollments.",
        reply,
        403,
      );
    }

    const enrollments = await getStudentEnrollments(
      studentId,
      visibleEnrollmentScopes,
    );

    if (typeof enrollments === "string") {
      return errorHandle("Unable to retrieve student enrollments.", reply, 500);
    }

    const activeEnrollments = enrollments.filter((e: any) => e.isActive);
    const inactiveEnrollments = enrollments.filter((e: any) => !e.isActive);

    return successHandle(
      {
        message: "Student enrollments retrieved successfully",
        enrollments: {
          all: enrollments,
          active: activeEnrollments,
          inactive: inactiveEnrollments,
        },
      },
      reply,
      200,
    );
  },
);

export const updateEnrollmentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== Role.ADMIN) {
      return errorHandle("Only admins can update enrollments.", reply, 403);
    }

    const { enrollmentId } = request.params as { enrollmentId: string };
    const data = request.body as {
      centerId?: string;
      semesterId?: string;
      projectId?: string;
      semesterLevelId?: string;
      level?: Level;
      isActive?: boolean;
    };

    if (!enrollmentId) {
      return errorHandle("Enrollment ID is required.", reply, 400);
    }

    // Validate level enum if provided
    if (data.level && !Object.values(Level).includes(data.level)) {
      return errorHandle("Invalid level provided.", reply, 400);
    }

    const context = await resolveEffectiveEnrollmentContext(enrollmentId, data);
    if (typeof context === "string") {
      return errorHandle(context, reply, 400);
    }

    const enrollment = await updateEnrollment(enrollmentId, {
      projectId: context.projectId,
      centerId: context.centerId,
      semesterId: context.semesterId,
      semesterLevelId: data.semesterLevelId ?? context.semesterLevelId,
      level: context.level,
      isActive: data.isActive,
    });

    if (typeof enrollment === "string") {
      return errorHandle(enrollment, reply, 500);
    }

    return successHandle(
      {
        message: "Enrollment updated successfully",
        enrollment: enrollment,
      },
      reply,
      200,
    );
  },
);

export const deleteEnrollmentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== Role.ADMIN) {
      return errorHandle("Only admins can delete enrollments.", reply, 403);
    }

    const { enrollmentId } = request.params as { enrollmentId: string };

    if (!enrollmentId) {
      return errorHandle("Enrollment ID is required.", reply, 400);
    }

    const result = await deleteEnrollment(enrollmentId);

    if (typeof result === "string") {
      return errorHandle(result, reply, 500);
    }

    return successHandle(
      {
        message: "Enrollment deleted successfully",
      },
      reply,
      200,
    );
  },
);

// User Management Controllers
export const getAllUsersController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) {
      return errorHandle("Authentication required.", reply, 401);
    }
    if (!isAdmin(authUser)) {
      return errorHandle("Administrator access required.", reply, 403);
    }

    const users = await getAllUsersWithAssignments();

    if (typeof users === "string") {
      return errorHandle(users, reply, 500);
    }

    return successHandle(
      {
        message: "Users retrieved successfully",
        users: users,
      },
      reply,
      200,
    );
  },
);

export const getContextStaffController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) {
      return errorHandle("Authentication required.", reply, 401);
    }

    const { projectId, centerId, semesterId } = request.query as {
      projectId?: string;
      centerId?: string;
      semesterId?: string;
    };
    if (
      typeof projectId !== "string" ||
      !projectId.trim() ||
      typeof centerId !== "string" ||
      !centerId.trim() ||
      typeof semesterId !== "string" ||
      !semesterId.trim()
    ) {
      return errorHandle(
        "Project ID, center ID, and semester ID are required.",
        reply,
        400,
      );
    }

    const scope = {
      projectId: projectId.trim(),
      centerId: centerId.trim(),
      semesterId: semesterId.trim(),
    };
    const assignments = isAdmin(authUser)
      ? []
      : await getActiveUserScopeAssignments(authUser.id);
    if (typeof assignments === "string") {
      return errorHandle(assignments, reply, 500);
    }

    if (
      !canAccessScope({
        identity: authUser,
        assignments,
        allowedSubRoles: Object.values(SubRole),
        scope,
      })
    ) {
      return errorHandle(
        "You are not authorized to view staff for this scope.",
        reply,
        403,
      );
    }

    const users = await getContextStaff({
      projectId: scope.projectId,
      centerId: scope.centerId,
      semesterId: scope.semesterId,
    });
    if (typeof users === "string") {
      return errorHandle(users, reply, 500);
    }

    return successHandle(
      {
        message: "Context staff retrieved successfully",
        users,
      },
      reply,
      200,
    );
  },
);

export const getRemunerationUsersController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) {
      return errorHandle("Authentication required.", reply, 401);
    }

    const { projectId, centerId, semesterId } = request.query as {
      projectId?: string;
      centerId?: string;
      semesterId?: string;
    };
    if (
      typeof projectId !== "string" ||
      !projectId.trim() ||
      typeof centerId !== "string" ||
      !centerId.trim() ||
      typeof semesterId !== "string" ||
      !semesterId.trim()
    ) {
      return errorHandle(
        "Project ID, center ID, and semester ID are required.",
        reply,
        400,
      );
    }

    const scope = {
      projectId: projectId.trim(),
      centerId: centerId.trim(),
      semesterId: semesterId.trim(),
    };
    const assignments = isAdmin(authUser)
      ? []
      : await getActiveUserScopeAssignments(authUser.id);
    if (typeof assignments === "string") {
      return errorHandle(assignments, reply, 500);
    }

    if (
      !canAccessScope({
        identity: authUser,
        assignments,
        allowedSubRoles: [SubRole.CENTER_MANAGER],
        scope,
      })
    ) {
      return errorHandle(
        "You are not authorized to administer remuneration for this scope.",
        reply,
        403,
      );
    }

    const users = await getRemunerationUsers({
      projectId: scope.projectId,
      centerId: scope.centerId,
      semesterId: scope.semesterId,
    });
    if (typeof users === "string") {
      return errorHandle(users, reply, 500);
    }

    return successHandle(
      {
        message: "Remuneration users retrieved successfully",
        users,
      },
      reply,
      200,
    );
  },
);

export const getSemesterUsersController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) return errorHandle("Authentication required.", reply, 401);
    const query = request.query as Record<string, unknown>;
    const scope = {
      projectId: typeof query.projectId === "string" ? query.projectId.trim() : "",
      centerId: typeof query.centerId === "string" ? query.centerId.trim() : "",
      semesterId: typeof query.semesterId === "string" ? query.semesterId.trim() : "",
    };
    if (!scope.projectId || !scope.centerId || !scope.semesterId) {
      return errorHandle("Project, center, and semester are required.", reply, 400);
    }
    const assignments = isAdmin(authUser)
      ? []
      : await getActiveUserScopeAssignments(authUser.id);
    if (
      typeof assignments === "string" ||
      !canAccessScope({
        identity: authUser,
        assignments,
        allowedSubRoles: [SubRole.CENTER_MANAGER],
        scope,
      })
    ) {
      return errorHandle("You are not authorized to view semester users.", reply, 403);
    }
    const users = await getSemesterUsers(scope);
    if (typeof users === "string") return errorHandle(users, reply, 500);
    return successHandle(
      { message: "Semester users retrieved successfully.", users },
      reply,
      200,
    );
  },
);

export const updateRemunerationRatesController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) return errorHandle("Authentication required.", reply, 401);

    const body = request.body as {
      projectId?: unknown;
      centerId?: unknown;
      semesterId?: unknown;
      rates?: unknown;
    };
    const projectId =
      typeof body?.projectId === "string" ? body.projectId.trim() : "";
    const centerId =
      typeof body?.centerId === "string" ? body.centerId.trim() : "";
    const semesterId =
      typeof body?.semesterId === "string" ? body.semesterId.trim() : "";
    if (!projectId || !centerId || !semesterId || !Array.isArray(body.rates)) {
      return errorHandle(
        "Project, center, semester, and rates are required.",
        reply,
        400,
      );
    }

    const rates: Array<{ userId: string; dailyRate: number }> = [];
    const seen = new Set<string>();
    for (const [index, raw] of body.rates.entries()) {
      if (
        typeof raw !== "object" ||
        raw === null ||
        Array.isArray(raw) ||
        Object.keys(raw).some(
          (key) => !["userId", "dailyRate"].includes(key),
        )
      ) {
        return errorHandle(`Rate ${index + 1} is invalid.`, reply, 400);
      }
      const { userId, dailyRate } = raw as {
        userId?: unknown;
        dailyRate?: unknown;
      };
      if (
        typeof userId !== "string" ||
        !userId.trim() ||
        seen.has(userId.trim()) ||
        typeof dailyRate !== "number" ||
        !Number.isFinite(dailyRate) ||
        dailyRate < 0 ||
        Math.round(dailyRate * 100) !== dailyRate * 100
      ) {
        return errorHandle(`Rate ${index + 1} is invalid.`, reply, 400);
      }
      seen.add(userId.trim());
      rates.push({ userId: userId.trim(), dailyRate });
    }

    const scope = { projectId, centerId, semesterId };
    const assignments = isAdmin(authUser)
      ? []
      : await getActiveUserScopeAssignments(authUser.id);
    if (typeof assignments === "string") {
      return errorHandle(assignments, reply, 500);
    }
    if (
      !canAccessScope({
        identity: authUser,
        assignments,
        allowedSubRoles: [SubRole.CENTER_MANAGER],
        scope,
      })
    ) {
      return errorHandle(
        "You are not authorized to administer remuneration for this scope.",
        reply,
        403,
      );
    }

    const payees = await getRemunerationUsers(scope);
    if (typeof payees === "string") return errorHandle(payees, reply, 500);
    const eligibleIds = new Set(payees.map((payee) => payee.id));
    if (rates.some((rate) => !eligibleIds.has(rate.userId))) {
      return errorHandle(
        "Every rate must belong to an eligible payee in this semester.",
        reply,
        400,
      );
    }

    const result = await updateSemesterRemunerationRates({
      semesterId,
      rates,
    });
    if (typeof result === "string") return errorHandle(result, reply, 500);
    return successHandle(
      { message: "Semester remuneration rates updated.", rates: result },
      reply,
      200,
    );
  },
);

export const setRemunerationPeriodController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) return errorHandle("Authentication required.", reply, 401);

    const body = (request.body ?? {}) as Record<string, unknown>;
    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";
    const centerId =
      typeof body.centerId === "string" ? body.centerId.trim() : "";
    const semesterId =
      typeof body.semesterId === "string" ? body.semesterId.trim() : "";
    if (!projectId || !centerId || !semesterId) {
      return errorHandle("Project, center, and semester are required.", reply, 400);
    }

    let period;
    try {
      period = parseRemunerationPeriodInput({
        userId: body.userId,
        amountPerDay: body.amountPerDay,
        effectiveFrom: body.effectiveFrom,
        ...Object.fromEntries(
          Object.entries(body).filter(
            ([key]) =>
              ![
                "projectId",
                "centerId",
                "semesterId",
                "userId",
                "amountPerDay",
                "effectiveFrom",
              ].includes(key),
          ),
        ),
      });
    } catch (error) {
      return errorHandle(
        error instanceof Error ? error.message : "Invalid remuneration details.",
        reply,
        400,
      );
    }

    const scope = { projectId, centerId, semesterId };
    const assignments = isAdmin(authUser)
      ? []
      : await getActiveUserScopeAssignments(authUser.id);
    if (
      typeof assignments === "string" ||
      !canAccessScope({
        identity: authUser,
        assignments,
        allowedSubRoles: [SubRole.CENTER_MANAGER],
        scope,
      })
    ) {
      return errorHandle(
        "You are not authorized to administer remuneration for this scope.",
        reply,
        403,
      );
    }

    const result = await setSemesterRemunerationPeriod({
      ...scope,
      ...period,
      actorId: authUser.id,
    });
    if (typeof result === "string") return errorHandle(result, reply, 400);
    return successHandle(
      { message: "Remuneration schedule updated.", periods: result },
      reply,
      200,
    );
  },
);

export const updateSemesterUserAssignmentsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser || authUser.role !== Role.ADMIN) {
      return errorHandle("Only admins can update semester roles.", reply, 403);
    }
    const { userId } = request.params as { userId?: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
    const centerId = typeof body.centerId === "string" ? body.centerId.trim() : "";
    const semesterId = typeof body.semesterId === "string" ? body.semesterId.trim() : "";
    if (!userId || !projectId || !centerId || !semesterId || !Array.isArray(body.assignments)) {
      return errorHandle("User, project, center, semester, and roles are required.", reply, 400);
    }
    const assignments: Array<{
      subRole: SubRole;
      semesterLevelId?: string;
      committedDays?: CommittedDays;
    }> = [];
    for (const raw of body.assignments) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return errorHandle("Every semester role must be valid.", reply, 400);
      }
      const value = raw as Record<string, unknown>;
      if (
        Object.keys(value).some(
          (key) => !["subRole", "semesterLevelId", "committedDays"].includes(key),
        ) ||
        typeof value.subRole !== "string" ||
        !Object.values(SubRole).includes(value.subRole as SubRole)
      ) {
        return errorHandle("Every semester role must be valid.", reply, 400);
      }
      const subRole = value.subRole as SubRole;
      const semesterLevelId =
        typeof value.semesterLevelId === "string" && value.semesterLevelId
          ? value.semesterLevelId
          : undefined;
      const committedDays =
        typeof value.committedDays === "string" &&
        Object.values(CommittedDays).includes(value.committedDays as CommittedDays)
          ? (value.committedDays as CommittedDays)
          : undefined;
      if (semesterLevelId && subRole !== SubRole.EDUCATOR) {
        return errorHandle("Only educators can have a semester level.", reply, 400);
      }
      assignments.push({ subRole, semesterLevelId, committedDays });
    }
    const result = await updateSemesterUserAssignments({
      userId,
      projectId,
      centerId,
      semesterId,
      assignments,
    });
    if (typeof result === "string") return errorHandle(result, reply, 400);
    return successHandle(
      { message: "Semester roles updated.", assignments: result },
      reply,
      200,
    );
  },
);

export const getUserAssignmentsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle(
        "Only admins can access user assignments.",
        reply,
        403,
      );
    }

    const { userId } = request.params as { userId: string };

    if (!userId) {
      return errorHandle("User ID is required.", reply, 400);
    }

    const assignments = await getUserRoleAssignments(userId);

    if (typeof assignments === "string") {
      return errorHandle(assignments, reply, 500);
    }

    return successHandle(
      {
        message: "User assignments retrieved successfully",
        assignments: assignments,
      },
      reply,
      200,
    );
  },
);

export const updateUserManagementController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle("Only admins can update user management.", reply, 403);
    }

    const { userId } = request.params as { userId: string };
    const data = (request.body ?? {}) as {
      role?: Role;
      roleAssignments?: Array<{
        subRole: SubRole;
        projectId?: string;
        centerId?: string;
        semesterId?: string;
        semesterLevelId?: string;
        level?: Level;
        committedDays?: string;
      }>;
    };

    if (!userId) {
      return errorHandle("User ID is required.", reply, 400);
    }

    if (data.role === undefined && data.roleAssignments === undefined) {
      return errorHandle("Role or role assignments are required.", reply, 400);
    }

    if (data.role !== undefined && !Object.values(Role).includes(data.role)) {
      return errorHandle("Invalid role provided.", reply, 400);
    }

    if (
      data.roleAssignments !== undefined &&
      !Array.isArray(data.roleAssignments)
    ) {
      return errorHandle("Role assignments must be an array.", reply, 400);
    }

    // Validate each assignment
    for (const assignment of data.roleAssignments ?? []) {
      if (!assignment.subRole) {
        return errorHandle(
          "Sub-role is required for each assignment.",
          reply,
          400,
        );
      }
      if (!Object.values(SubRole).includes(assignment.subRole)) {
        return errorHandle("Invalid sub-role provided.", reply, 400);
      }
      if (
        assignment.level &&
        !Object.values(Level).includes(assignment.level)
      ) {
        return errorHandle("Invalid level provided.", reply, 400);
      }

      // Validate that level and committedDays are only set for appropriate roles
      if (
        (assignment.level || assignment.semesterLevelId) &&
        assignment.subRole !== "EDUCATOR"
      ) {
        return errorHandle(
          "Semester level can only be set for EDUCATOR sub-role.",
          reply,
          400,
        );
      }

      if (
        assignment.committedDays &&
        !["CENTER_MANAGER", "EDUCATOR"].includes(assignment.subRole)
      ) {
        return errorHandle(
          "CommittedDays can only be set for CENTER_MANAGER and EDUCATOR sub-roles.",
          reply,
          400,
        );
      }
    }

    let updatedAssignments;
    if (data.roleAssignments !== undefined) {
      updatedAssignments = await bulkUpdateUserAssignments(
        userId,
        data.roleAssignments,
      );

      if (typeof updatedAssignments === "string") {
        return errorHandle(updatedAssignments, reply, 500);
      }
    }

    if (data.role !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: data.role },
      });
    }

    return successHandle(
      {
        message: "User management updated successfully",
        assignments: updatedAssignments,
      },
      reply,
      200,
    );
  },
);

export const createUserAssignmentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle(
        "Only admins can create user assignments.",
        reply,
        403,
      );
    }

    const data = request.body as {
      userId: string;
      subRole: SubRole;
      projectId?: string;
      centerId?: string;
      semesterId?: string;
      semesterLevelId?: string;
      level?: Level;
      committedDays?: string;
    };

    if (!data.userId || !data.subRole) {
      return errorHandle("User ID and sub-role are required.", reply, 400);
    }
    if (!Object.values(SubRole).includes(data.subRole)) {
      return errorHandle("Invalid sub-role provided.", reply, 400);
    }
    if (data.level && !Object.values(Level).includes(data.level)) {
      return errorHandle("Invalid level provided.", reply, 400);
    }

    // Validate business rules
    if ((data.level || data.semesterLevelId) && data.subRole !== "EDUCATOR") {
      return errorHandle(
        "Semester level can only be set for EDUCATOR sub-role.",
        reply,
        400,
      );
    }

    if (
      data.committedDays &&
      !["CENTER_MANAGER", "EDUCATOR"].includes(data.subRole)
    ) {
      return errorHandle(
        "CommittedDays can only be set for CENTER_MANAGER and EDUCATOR sub-roles.",
        reply,
        400,
      );
    }

    const assignment = await createUserRoleAssignment(data);

    if (typeof assignment === "string") {
      return errorHandle(assignment, reply, 500);
    }

    return successHandle(
      {
        message: "User assignment created successfully",
        assignment: assignment,
      },
      reply,
      201,
    );
  },
);

export const deleteUserAssignmentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle(
        "Only admins can delete user assignments.",
        reply,
        403,
      );
    }

    const { assignmentId } = request.params as { assignmentId: string };

    if (!assignmentId) {
      return errorHandle("Assignment ID is required.", reply, 400);
    }

    const result = await deleteUserRoleAssignment(assignmentId);

    if (typeof result === "string") {
      return errorHandle(result, reply, 500);
    }

    return successHandle(
      {
        message: "User assignment deleted successfully",
      },
      reply,
      200,
    );
  },
);

// Get Single User Controller
export const getUserByIdController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) {
      return errorHandle("Authentication required.", reply, 401);
    }

    // Only admins can view other users, or users can view themselves
    const { userId } = request.params as { userId: string };
    if (authUser.role !== Role.ADMIN && authUser.id !== userId) {
      return errorHandle(
        "You can only view your own profile or you must be an admin.",
        reply,
        403,
      );
    }

    const user =
      authUser.id === userId
        ? await getUserById(userId)
        : await getAdminUserById(userId);
    if (!user || typeof user === "string") {
      return errorHandle("User not found.", reply, 404);
    }

    return successHandle(
      {
        message: "User retrieved successfully",
        user,
      },
      reply,
      200,
    );
  },
);

// Update User Details Controller
export const updateUserController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) {
      return errorHandle("Authentication required.", reply, 401);
    }

    const { userId } = request.params as { userId: string };

    // Only admins can update other users, or users can update themselves
    if (authUser.role !== Role.ADMIN && authUser.id !== userId) {
      return errorHandle(
        "You can only update your own profile or you must be an admin.",
        reply,
        403,
      );
    }

    const {
      data: extractedData,
      forbiddenFields,
      unknownFields,
    } = extractGeneralUserUpdate(request.body);

    if (forbiddenFields.length > 0) {
      return errorHandle(
        `These fields cannot be updated here: ${forbiddenFields.join(", ")}.`,
        reply,
        403,
      );
    }

    if (unknownFields.length > 0) {
      return errorHandle(
        `Unknown user update fields: ${unknownFields.join(", ")}.`,
        reply,
        400,
      );
    }

    for (const [field, value] of Object.entries(extractedData)) {
      if (
        value !== undefined &&
        !(
          ["dob", "middleName", "lastName"].includes(field) && value === null
        ) &&
        typeof value !== "string"
      ) {
        return errorHandle(`${field} must be a string.`, reply, 400);
      }
    }

    const data = extractedData as {
      name?: string;
      firstName?: string;
      middleName?: string | null;
      lastName?: string | null;
      email?: string;
      phone?: string;
      qualification?: string;
      address?: string;
      dob?: string | null;
      profileImageUrl?: string;
    };

    // Validate required fields
    if (
      data.email !== undefined &&
      (!data.email.trim() || !/\S+@\S+\.\S+/.test(data.email))
    ) {
      return errorHandle("Valid email is required.", reply, 400);
    }

    try {
      // Parse DOB if provided
      let dobDate: Date | null = null;
      if (data.dob) {
        dobDate = new Date(data.dob);
        if (isNaN(dobDate.getTime())) {
          return errorHandle("Invalid date of birth format.", reply, 400);
        }
      }

      // Update user basic details
      const updateData: {
        name?: string;
        firstName?: string;
        middleName?: string | null;
        lastName?: string | null;
        email?: string;
        phone?: string | null;
        qualification?: string | null;
        address?: string | null;
        dob?: Date | null;
        profileImageUrl?: string | null;
      } = {};
      if (
        ["name", "firstName", "middleName", "lastName"].some((field) =>
          Object.prototype.hasOwnProperty.call(data, field),
        )
      ) {
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            firstName: true,
            middleName: true,
            lastName: true,
          },
        });
        if (!currentUser) {
          return errorHandle("User not found.", reply, 404);
        }

        const currentName = currentUser.firstName
          ? {
              firstName: currentUser.firstName,
              middleName: currentUser.middleName,
              lastName: currentUser.lastName,
            }
          : parseLegacyPersonName(currentUser.name);
        try {
          Object.assign(
            updateData,
            resolvePersonNameUpdate(data, currentName) ?? {},
          );
        } catch (error) {
          return errorHandle((error as Error).message, reply, 400);
        }
      }
      if (data.email !== undefined) updateData.email = data.email.trim();
      if (data.phone !== undefined)
        updateData.phone = data.phone?.trim() || null;
      if (data.qualification !== undefined)
        updateData.qualification = data.qualification?.trim() || null;
      if (data.address !== undefined)
        updateData.address = data.address?.trim() || null;
      if (data.dob !== undefined) updateData.dob = dobDate;
      if (data.profileImageUrl !== undefined)
        updateData.profileImageUrl = data.profileImageUrl?.trim() || null;

      // Update user in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Get full user details with assignments
      const fullUser =
        authUser.id === userId
          ? await getUserById(userId)
          : await getAdminUserById(userId);

      return successHandle(
        {
          message: "User updated successfully",
          user: fullUser,
        },
        reply,
        200,
      );
    } catch (error) {
      console.error("Error updating user:", error);
      return errorHandle("Failed to update user.", reply, 500);
    }
  },
);
