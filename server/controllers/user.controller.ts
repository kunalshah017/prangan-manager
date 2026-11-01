import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import {
  createUser,
  getUserByEmail,
  getAdminUserById,
  getUserById,
  getContextStaff,
  getRemunerationUsers,
  updateUser,
  getUnverifiedUsers,
  createStudent,
  getAllStudents,
  getStudentById,
  getStudentActiveEnrollmentScopes,
  updateStudent,
  deleteStudent,
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
  setSemesterRemunerationPeriod,
  applyRemunerationPeriod,
  checkRemunerationPeriod,
} from "../service/user.service.js";
import type { EnrollmentScope } from "../service/user.service.js";
import { formatAmount } from "../email/remuneration-payment-email.js";
import { getProjectById } from "../service/project.service.js";
import { getCenterById } from "../service/center.service.js";
import { getSemesterById } from "../service/semester.service.js";
import type { UserRegistrationRequest } from "../types/user.types.js";
import bcryptjs from "bcryptjs";
import {
  UserStatus,
  Role,
  SubRole,
  CommittedDays,
  AccountTokenType,
  Prisma,
} from "../generated/prisma/index.js";
import { prisma } from "../lib/prisma.js";
import {
  indiaToday,
  endedAssignmentData,
  findSecondEducatorLevel,
  finishedSemesterMessage,
  isSemesterFinished,
  SECOND_EDUCATOR_LEVEL_MESSAGE,
} from "../lib/role-assignments.js";
import {
  parseLegacyPersonName,
  resolvePersonNameCreate,
  resolvePersonNameUpdate,
} from "../lib/person-name.js";
import {
  calendarDate,
  isValidDateFormat,
} from "../utils/dateHelpers.js";
import {
  patchUserBankDetails,
  updateUserBankDetails,
  validateRoleAssignmentHierarchy,
  type BankDetailsPatch,
} from "../service/user.service.js";
import { canAccessScope, isAdmin } from "../security/authorization.js";
import {
  canManageStudentProfile,
  canReadStudentEnrollment,
} from "../security/student-authorization.js";
import {
  extractGeneralUserUpdate,
  isEmailAddress,
} from "../security/user-update.js";
import { parseRemunerationPeriodInput } from "../security/remuneration-input.js";
import { createRawAccountToken } from "../security/account-token.js";
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
  clearRegistrationRequestInBackground,
  notifyAdminsInBackground,
  registrationRequestMessage,
} from "../service/notification.service.js";
import { resolvePayRateRemindersInBackground } from "../service/reminder.service.js";
import {
  EMAIL_JOB_COMMITTED,
  emitCommitTrigger,
} from "../lib/commit-triggers.js";
import {
  buildPasswordResetEmailJob,
  buildAccessRestoredEmailJob,
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

const BANK_FIELDS = [
  "bankAccountNumber",
  "bankAccountName",
  "bankIfsc",
  "bankName",
  "bankBranch",
  "upiId",
] as const;

export const updateUserBankDetailsAsAdmin = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) return errorHandle("Unauthorized", reply, 401);
    if (authUser.role !== Role.ADMIN) {
      return errorHandle("Only administrators can edit another user's bank details.", reply, 403);
    }
    const { userId } = request.params as { userId: string };
    const body = (request.body ?? {}) as Record<string, unknown>;

    const patch: BankDetailsPatch = {};
    for (const field of BANK_FIELDS) {
      const value = body[field];
      if (value === undefined || value === null) continue;
      if (typeof value !== "string") {
        return errorHandle(`${field} must be text.`, reply, 400);
      }
      const trimmed = field === "bankIfsc" ? value.trim().toUpperCase() : value.trim();
      if (trimmed) patch[field] = trimmed;
    }
    if (patch.bankIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(patch.bankIfsc)) {
      return errorHandle("Invalid IFSC code format.", reply, 400);
    }
    if (Object.keys(patch).length === 0) {
      return errorHandle("Enter at least one bank detail to change.", reply, 400);
    }

    const bank = await patchUserBankDetails(userId, patch);
    if (typeof bank === "string") return errorHandle(bank, reply, 500);
    if (!bank) return errorHandle("User not found.", reply, 404);

    // Echo only the masked summary; the full number never leaves the server.
    return successHandle(
      {
        message: "Bank details updated successfully",
        bankSummary: {
          accountLast4: bank.bankAccountNumber ? bank.bankAccountNumber.slice(-4) : null,
          bankName: bank.bankName ?? null,
          bankIfsc: bank.bankIfsc ?? null,
          hasUpi: Boolean(bank.upiId),
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

    if (typeof data.email !== "string" || !isEmailAddress(data.email.trim())) {
      return errorHandle("A valid email address is required.", reply, 400);
    }
    data.email = data.email.trim();

    let resolvedName;
    try {
      resolvedName = resolvePersonNameCreate(data);
    } catch (error) {
      return errorHandle((error as Error).message, reply, 400);
    }
    // Self-registration asks for the full name; admins can still edit it later.
    if (!resolvedName.middleName || !resolvedName.lastName) {
      return errorHandle("Middle name and last name are required.", reply, 400);
    }

    // Validate DOB if provided
    let dobDate: Date | null = null;
    if (data.dob) {
      if (!isValidDateFormat(data.dob)) {
        return errorHandle(
          "Invalid date format. Please use YYYY-MM-DD.",
          reply,
          400,
        );
      }

      dobDate = calendarDate(data.dob);

      // Validate DOB is not in the future (a calendar day, compared with India's today)
      if (data.dob > indiaToday()) {
        return errorHandle(
          "Date of birth cannot be in the future.",
          reply,
          400,
        );
      }

      // Validate reasonable age (between 5 and 120 years)
      const age = Number(indiaToday().slice(0, 4)) - Number(data.dob.slice(0, 4));
      if (age < 5 || age > 120) {
        return errorHandle("Please provide a valid date of birth.", reply, 400);
      }
    }

    const [checkUser, hashedPassword] = await Promise.all([
      getUserByEmail(data.email),
      // Nobody knows this password; the activation link sets the real one.
      bcryptjs.hash(createRawAccountToken(), 10),
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

    notifyAdminsInBackground(registrationRequestMessage(user));

    return successHandle(
      { message: "User registered successfully" },
      reply,
      201,
    );
  },
);

const LOGIN_FAILED_MESSAGE =
  "Email or password is incorrect. Check them and try again, or choose Forgot password.";

export const loginUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as { email: string; password: string };

    if (!data.email || !data.password) {
      return errorHandle("Email and password are required.", reply, 400);
    }

    const user = await getUserByEmail(data.email);

    if (typeof user === "string") {
      return errorHandle(
        "Sign in isn't available right now. Try again in a minute.",
        reply,
        500,
      );
    }
    // Same answer for an unknown email and a wrong password.
    if (!user) {
      return errorHandle(LOGIN_FAILED_MESSAGE, reply, 401);
    }

    // Pending people have no password yet, so their status is checked first.
    if (user.status === UserStatus.PENDING) {
      return errorHandle(
        "Your registration is waiting for approval. You'll get an email to set your password once it's approved.",
        reply,
        403,
      );
    }
    if (user.status === UserStatus.REJECTED) {
      return errorHandle(
        // Turned-down registrations are deleted, so this is someone whose access was revoked.
        "Your access to Prangan Manager has been removed. Please contact a Prangan administrator.",
        reply,
        403,
      );
    }

    const isPasswordValid = await bcryptjs.compare(
      data.password,
      user.password,
    );

    if (!isPasswordValid) {
      // Approved but never activated: their password was never set.
      const activation = await prisma.accountToken.findFirst({
        where: { userId: user.id, type: AccountTokenType.ACTIVATION },
        select: { id: true },
      });
      const usedToken = activation
        ? await prisma.accountToken.findFirst({
            where: { userId: user.id, usedAt: { not: null } },
            select: { id: true },
          })
        : null;
      if (activation && !usedToken) {
        return errorHandle(
          "Your account isn't activated yet. Use the link in your approval email to set a password, or choose Forgot password to get a new link.",
          reply,
          403,
        );
      }
      return errorHandle(LOGIN_FAILED_MESSAGE, reply, 401);
    }

    const token = createSessionToken(user.id, user.sessionVersion);

    // Fetch full user details with role assignments for response
    const fullUserDetails = await getUserById(user.id, {
      includePastAssignments: user.role === Role.ADMIN,
    });

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

    const fullUserDetails = await getUserById(user.id, {
      includePastAssignments: user.role === Role.ADMIN,
    });

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
  committedDays?: string;
};

const isPaidRole = (subRole: string) => subRole === "EDUCATOR" || subRole === "CENTER_MANAGER";

export const buildRegistrationRoleDetails = async (
  assignments: RegistrationRoleAssignment[],
  rates: GrantedRate[] = [],
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
          // Calendar days: format the stored day itself, not the server's zone.
          const day = (date: Date) =>
            date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
          const startDate = day(semester.startDate);
          const endDate = day(semester.endDate);
          detail += `<p><strong>📅 Semester:</strong> ${semester.name} (${startDate} - ${endDate})</p>`;
        }
      }
      if (assignment.semesterLevelId && assignment.subRole === "EDUCATOR") {
        const semesterLevel = await resolveSemesterLevelInput({
          semesterId: assignment.semesterId,
          semesterLevelId: assignment.semesterLevelId,
        });
        detail += `<p><strong>📚 Teaching Level:</strong> ${semesterLevel.academicLevel.name}</p>`;
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
      // One rate per semester: shown on the first paid role there.
      const rate = rates.find((item) => item.semesterId === assignment.semesterId);
      const firstPaid = assignments.find(
        (item) => isPaidRole(item.subRole) && item.semesterId === assignment.semesterId,
      );
      if (rate && firstPaid === assignment) {
        const from = new Date(`${rate.effectiveFrom}T00:00:00.000Z`).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
        detail += `<p><strong>💰 Remuneration:</strong> ${formatAmount(rate.amountPerDay)} per day present, from ${from}</p>`;
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

type GrantedRate = {
  projectId: string;
  centerId: string;
  semesterId: string;
  amountPerDay: number;
  effectiveFrom: string;
};

type GrantedAssignments =
  | { assignments: RegistrationRoleAssignment[]; rates: GrantedRate[]; roleAssignmentDetails: string }
  | { error: string; status: number };

// Daily rates sent with the roles: one per semester, each for a paid role given here.
const parseGrantedRates = (
  input: unknown,
  assignments: RegistrationRoleAssignment[],
): GrantedRate[] | string => {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return "Invalid daily rates.";
  const rates: GrantedRate[] = [];
  for (const item of input as Array<Record<string, unknown>>) {
    const { projectId, centerId, semesterId, amountPerDay, effectiveFrom } = item ?? {};
    if (
      typeof projectId !== "string" ||
      typeof centerId !== "string" ||
      typeof semesterId !== "string" ||
      typeof amountPerDay !== "number" ||
      !Number.isFinite(amountPerDay) ||
      typeof effectiveFrom !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)
    ) {
      return "Invalid daily rate.";
    }
    const paidHere = assignments.some(
      (assignment) =>
        isPaidRole(assignment.subRole) &&
        assignment.projectId === projectId &&
        assignment.centerId === centerId &&
        assignment.semesterId === semesterId,
    );
    if (!paidHere) return "A daily rate needs an educator or centre manager role in that semester.";
    if (rates.some((rate) => rate.semesterId === semesterId)) return "One daily rate per semester.";
    rates.push({ projectId, centerId, semesterId, amountPerDay, effectiveFrom });
  }
  return rates;
};

class GrantRateError extends Error {}

// Saves the granted rates inside the grant's transaction, after the roles.
const grantRates = async (
  tx: Prisma.TransactionClient,
  userId: string,
  rates: GrantedRate[],
  actorId: string,
) => {
  for (const rate of rates) {
    const problem = await checkRemunerationPeriod(tx, { ...rate, userId });
    if (problem) throw new GrantRateError(problem);
    await applyRemunerationPeriod(tx, { ...rate, userId, actorId });
  }
};

// The roles given when approving a request or restoring access: each fits the
// project > centre > semester hierarchy in a semester still running, and an
// educator teaches one level per semester.
const prepareGrantedAssignments = async (
  role: Role,
  roleAssignments: RegistrationRoleAssignment[] | undefined,
  remunerationPeriods?: unknown,
): Promise<GrantedAssignments> => {
  const assignments = role === Role.USER ? roleAssignments ?? [] : [];
  for (const assignment of assignments) {
    if (!assignment.subRole) {
      return { error: "SubRole is required for each role assignment.", status: 400 };
    }
    if ("level" in assignment) {
      return { error: "Legacy level is not supported; use semesterLevelId.", status: 400 };
    }
    if (
      assignment.committedDays &&
      !["CENTER_MANAGER", "EDUCATOR"].includes(assignment.subRole)
    ) {
      return { error: "CommittedDays can only be assigned to CENTER_MANAGER or EDUCATOR sub-roles.", status: 400 };
    }
  }

  if (findSecondEducatorLevel(assignments)) {
    return { error: SECOND_EDUCATOR_LEVEL_MESSAGE, status: 422 };
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
  // Approved roles must fit the project > centre > semester hierarchy and
  // belong to a semester that is still running.
  for (const assignment of uniqueAssignments) {
    if (!Object.values(SubRole).includes(assignment.subRole as SubRole)) {
      return { error: "Unknown role in assignment.", status: 400 };
    }
    const hierarchy = await validateRoleAssignmentHierarchy({
      projectId: assignment.projectId || undefined,
      centerId: assignment.centerId || undefined,
      semesterId: assignment.semesterId || undefined,
    });
    if (!hierarchy.isValid) {
      return { error: hierarchy.error ?? "Invalid assignment.", status: 400 };
    }
    if (assignment.semesterId) {
      const semester = await prisma.semesters.findUnique({
        where: { id: assignment.semesterId },
        select: { name: true, status: true, endDate: true },
      });
      if (semester && isSemesterFinished(semester)) {
        return { error: finishedSemesterMessage(semester.name), status: 422 };
      }
    }
  }
  const rates = parseGrantedRates(remunerationPeriods, uniqueAssignments);
  if (typeof rates === "string") return { error: rates, status: 400 };
  let roleAssignmentDetails = "";
  try {
    roleAssignmentDetails = await buildRegistrationRoleDetails(uniqueAssignments, rates);
  } catch (error) {
    console.error("Failed to prepare role assignment email details:", error);
  }
  return { assignments: uniqueAssignments, rates, roleAssignmentDetails };
};

// Ends the person's active roles and gives them the granted ones.
const grantAssignments = async (
  tx: Prisma.TransactionClient,
  userId: string,
  assignments: RegistrationRoleAssignment[],
) => {
  await tx.userRoleAssignments.updateMany({
    where: { userId, isActive: true },
    data: endedAssignmentData(),
  });
  const createdAssignments = [];
  for (const assignment of assignments) {
    const semesterLevel =
      assignment.subRole === "EDUCATOR"
        ? await resolveSemesterLevelInput({
            semesterId: assignment.semesterId,
            semesterLevelId: assignment.semesterLevelId,
          })
        : null;
    createdAssignments.push(
      await tx.userRoleAssignments.create({
        data: {
          userId,
          subRole: assignment.subRole as SubRole,
          projectId: assignment.projectId || null,
          centerId: assignment.centerId || null,
          semesterId: assignment.semesterId || null,
          semesterLevelId: semesterLevel?.id || null,
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
  return createdAssignments;
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
      // Rejecting can skip the email to the applicant.
      sendEmail?: boolean;
      roleAssignments?: RegistrationRoleAssignment[];
      // Daily rates for the paid roles, saved with them and listed in the email.
      remunerationPeriods?: unknown;
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
      const emailApplicant = data.sendEmail !== false;
      const rejectionReason =
        data.rejectionReason ||
        "No specific reason was provided. Please contact an administrator for more details.";
      try {
        const rejected = await prisma.$transaction(async (tx) => {
          const deleted = await tx.user.deleteMany({
            where: { id: data.userId, status: UserStatus.PENDING },
          });
          if (deleted.count !== 1) return false;
          if (!emailApplicant) return true;
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
        clearRegistrationRequestInBackground(data.userId);
        if (emailApplicant) emitCommitTrigger(EMAIL_JOB_COMMITTED);
        return successHandle(
          {
            message: emailApplicant
              ? "User rejected and removed from the system. Rejection email queued."
              : "User rejected and removed from the system. No email sent.",
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

    const prepared = await prepareGrantedAssignments(data.role, data.roleAssignments, data.remunerationPeriods);
    if ("error" in prepared) return errorHandle(prepared.error, reply, prepared.status);
    const { assignments: uniqueAssignments, rates, roleAssignmentDetails } = prepared;

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
        const assignmentsResult =
          uniqueAssignments.length > 0
            ? await grantAssignments(tx, data.userId, uniqueAssignments)
            : null;
        await grantRates(tx, data.userId, rates, admin.id);

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
      clearRegistrationRequestInBackground(data.userId);
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
      if (error instanceof GrantRateError) return errorHandle(error.message, reply, 400);
      console.error("User approval transaction failed:", error);
      if (error instanceof AcademicLevelServiceError) {
        return errorHandle(error.message, reply, error.statusCode);
      }
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

const PASSWORD_RESET_REPEAT_MS = 5 * 60 * 1000;

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
      user.status === UserStatus.APPROVED &&
      // A fresh link is still in their inbox; repeats would only cancel it.
      !(await prisma.accountToken.findFirst({
        where: {
          userId: user.id,
          type: AccountTokenType.PASSWORD_RESET,
          usedAt: null,
          createdAt: { gt: new Date(Date.now() - PASSWORD_RESET_REPEAT_MS) },
        },
        select: { id: true },
      }))
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
        data: endedAssignmentData(),
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

// Gives a revoked person access again the way a request is approved: a role
// and assignments in running semesters. Daily rates are then saved like any
// role's. The email is optional.
export const restoreUserAccessController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle("Only admins can restore portal access.", reply, 403);
    }
    const { userId } = request.params as { userId: string };
    const data = (request.body ?? {}) as {
      role?: Role;
      roleAssignments?: RegistrationRoleAssignment[];
      remunerationPeriods?: unknown;
      sendEmail?: boolean;
    };
    if (!userId || !data.role || !Object.values(Role).includes(data.role)) {
      return errorHandle("User ID and role are required.", reply, 400);
    }
    if (data.role === Role.USER && !data.roleAssignments?.length) {
      return errorHandle("Give at least one assignment.", reply, 400);
    }
    const prepared = await prepareGrantedAssignments(data.role, data.roleAssignments, data.remunerationPeriods);
    if ("error" in prepared) return errorHandle(prepared.error, reply, prepared.status);
    const sendEmail = data.sendEmail !== false;

    try {
      const restored = await prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({
          where: { id: userId, status: UserStatus.REJECTED },
          data: { status: UserStatus.APPROVED, role: data.role },
        });
        if (updated.count !== 1) return null;
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true },
        });
        if (!user) return null;
        if (prepared.assignments.length > 0) {
          await grantAssignments(tx, userId, prepared.assignments);
        }
        await grantRates(tx, userId, prepared.rates, admin.id);
        if (sendEmail) {
          await enqueueEmail(
            buildAccessRestoredEmailJob({
              userId,
              email: user.email,
              name: user.name,
              signInUrl: `${getAllowedClientOrigin()}/login`,
              roleAssignmentDetails: prepared.roleAssignmentDetails,
              restoredAt: new Date(),
            }),
            tx,
          );
        }
        return user;
      });
      if (!restored) {
        return errorHandle("This person's access isn't revoked.", reply, 409);
      }
      if (sendEmail) emitCommitTrigger(EMAIL_JOB_COMMITTED);
      return successHandle(
        {
          message: sendEmail ? "Access restored. Email queued." : "Access restored. No email sent.",
          user: await getAdminUserById(userId),
        },
        reply,
        200,
      );
    } catch (error) {
      if (error instanceof GrantRateError) return errorHandle(error.message, reply, 400);
      console.error("Restoring access failed:", error);
      if (error instanceof AcademicLevelServiceError) {
        return errorHandle(error.message, reply, error.statusCode);
      }
      return errorHandle("Database operation failed.", reply, 500);
    }
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
        semesterLevelId: string;
      };
    };
    let resolvedEnrollment:
      | {
          centerId: string;
          semesterId: string;
          projectId: string;
          semesterLevelId: string;
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
        !data.enrollment.semesterLevelId
      ) {
        return errorHandle(
          "All enrollment fields (centerId, semesterId, projectId, and semesterLevelId) are required when enrollment is provided.",
          reply,
          400,
        );
      }

      if ("level" in data.enrollment) {
        return errorHandle(
          "Legacy level is not supported; use semesterLevelId.",
          reply,
          400,
        );
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
      if (!isValidDateFormat(data.dob)) {
        return errorHandle(
          "Invalid date format for DOB. Please use YYYY-MM-DD.",
          reply,
          400,
        );
      }

      dobDate = calendarDate(data.dob);

      // Validate DOB is not in the future (a calendar day, compared with India's today)
      if (data.dob > indiaToday()) {
        return errorHandle(
          "Date of birth cannot be in the future.",
          reply,
          400,
        );
      }

      // Validate reasonable age for students (between 3 and 25 years)
      const age = Number(indiaToday().slice(0, 4)) - Number(data.dob.slice(0, 4));
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
        semesterLevelId: string;
      }>;
      enrollment?: {
        centerId?: string;
        semesterId?: string;
        projectId?: string;
        semesterLevelId?: string;
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

    if (data.enrollment && "level" in data.enrollment) {
      return errorHandle(
        "Legacy level is not supported; use semesterLevelId.",
        reply,
        400,
      );
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
          !enrollment.semesterLevelId
        ) {
          return errorHandle(
            "Each enrollment must have centerId, semesterId, projectId, and semesterLevelId",
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
        if (!isValidDateFormat(data.dob)) {
          return errorHandle(
            "Invalid date format for DOB. Please use YYYY-MM-DD.",
            reply,
            400,
          );
        }

        const dobDate = calendarDate(data.dob);

        // Validate DOB is not in the future (a calendar day, compared with India's today)
        if (data.dob > indiaToday()) {
          return errorHandle(
            "Date of birth cannot be in the future.",
            reply,
            400,
          );
        }

        // Validate reasonable age for students (between 3 and 25 years)
        const age = Number(indiaToday().slice(0, 4)) - Number(data.dob.slice(0, 4));
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

export const getStudentsBySemesterLevelController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) return errorHandle("Unauthorized access.", reply, 401);

    const { semesterLevelId } = request.params as { semesterLevelId: string };
    if (!semesterLevelId) {
      return errorHandle("Semester level ID is required.", reply, 400);
    }

    const enrollments = await getUserAccessibleStudents(user.id, user.role, {
      semesterLevelId,
    });
    if (typeof enrollments === "string") {
      return errorHandle(enrollments, reply, 500);
    }

    return successHandle(
      { message: "Student enrollments retrieved successfully", enrollments },
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
      semesterLevelId: string;
    };

    if (
      !data.studentId ||
      !data.centerId ||
      !data.semesterId ||
      !data.projectId ||
      !data.semesterLevelId
    ) {
      return errorHandle("All enrollment fields are required.", reply, 400);
    }

    if ("level" in data) {
      return errorHandle(
        "Legacy level is not supported; use semesterLevelId.",
        reply,
        400,
      );
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
      semesterLevelId: string;
    };

    if (!studentId) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    if (
      !data.centerId ||
      !data.semesterId ||
      !data.projectId ||
      !data.semesterLevelId
    ) {
      return errorHandle("All enrollment fields are required.", reply, 400);
    }

    if ("level" in data) {
      return errorHandle(
        "Legacy level is not supported; use semesterLevelId.",
        reply,
        400,
      );
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
      isActive?: boolean;
    };

    if (!enrollmentId) {
      return errorHandle("Enrollment ID is required.", reply, 400);
    }

    if ("level" in data) {
      return errorHandle(
        "Legacy level is not supported; use semesterLevelId.",
        reply,
        400,
      );
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
    if (authUser.role !== Role.ADMIN) {
      return errorHandle("Only admins can administer remuneration.", reply, 403);
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

export const setRemunerationPeriodController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const authUser = request.user;
    if (!authUser) return errorHandle("Authentication required.", reply, 401);
    if (authUser.role !== Role.ADMIN) {
      return errorHandle("Only admins can administer remuneration.", reply, 403);
    }

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

    const result = await setSemesterRemunerationPeriod({
      ...scope,
      ...period,
      actorId: authUser.id,
    });
    if (typeof result === "string") return errorHandle(result, reply, 400);
    resolvePayRateRemindersInBackground(semesterId);
    return successHandle(
      { message: "Remuneration schedule updated.", periods: result },
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
      if ("level" in assignment) {
        return errorHandle(
          "Legacy level is not supported; use semesterLevelId.",
          reply,
          400,
        );
      }

      // Validate that semester level and committedDays are only set for appropriate roles
      if (
        assignment.semesterLevelId &&
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

      if (updatedAssignments instanceof AcademicLevelServiceError) {
        return errorHandle(
          updatedAssignments.message,
          reply,
          updatedAssignments.statusCode,
        );
      }
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
      committedDays?: string;
    };

    if (!data.userId || !data.subRole) {
      return errorHandle("User ID and sub-role are required.", reply, 400);
    }
    if (!Object.values(SubRole).includes(data.subRole)) {
      return errorHandle("Invalid sub-role provided.", reply, 400);
    }
    if ("level" in data) {
      return errorHandle(
        "Legacy level is not supported; use semesterLevelId.",
        reply,
        400,
      );
    }

    // Validate business rules
    if (data.semesterLevelId && data.subRole !== "EDUCATOR") {
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

    if (assignment instanceof AcademicLevelServiceError) {
      return errorHandle(assignment.message, reply, assignment.statusCode);
    }
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
        ? await getUserById(userId, { includePastAssignments: authUser.role === Role.ADMIN })
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

    if (data.email !== undefined && !isEmailAddress(data.email.trim())) {
      return errorHandle("A valid email address is required.", reply, 400);
    }
    // A changed email redirects password resets, so only admins may change it.
    if (
      data.email !== undefined &&
      authUser.role !== Role.ADMIN &&
      data.email.trim() !== authUser.email
    ) {
      return errorHandle(
        "Ask an administrator to change your email address.",
        reply,
        403,
      );
    }

    try {
      // Parse DOB if provided
      let dobDate: Date | null = null;
      if (data.dob) {
        if (!isValidDateFormat(data.dob)) {
          return errorHandle("Date of birth must be YYYY-MM-DD.", reply, 400);
        }
        dobDate = calendarDate(data.dob);
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
          ? await getUserById(userId, { includePastAssignments: authUser.role === Role.ADMIN })
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
