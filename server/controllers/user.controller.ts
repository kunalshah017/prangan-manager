import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/handler.js";
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getUnverifiedUsers,
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByLevel,
  getStudentsByProject,
  getStudentsByCenter,
  getStudentsBySemester,
  enrollStudent,
  promoteStudent,
  getStudentHistory,
  createUserRoleAssignment,
  getUserRoleAssignments,
  updateUserRoleAssignment,
  deleteUserRoleAssignment,
  getAllUsersWithAssignments,
  bulkUpdateUserAssignments,
  getUserAccessibleStudents,
} from "../service/user.service.js";
import { getProjectById } from "../service/project.service.js";
import { getCenterById } from "../service/center.service.js";
import { getSemesterById } from "../service/semester.service.js";
import type { UserRegistrationRequest } from "../types/user.types.js";
import { generToken } from "../utils/generateToken.js";
import bcryptjs from "bcryptjs";
import { sendEmail } from "../utils/mail.js";
import {
  UserStatus,
  Level,
  Role,
  PrismaClient,
  SubRole,
  CommittedDays,
} from "../generated/prisma/index.js";
import {
  convertToDateTime,
  isValidDateFormat,
  isValidISOFormat,
} from "../utils/dateHelpers.js";
import { EMAIL_TEMPLATES } from "../constants/email_templates.js";
import { updateUserBankDetails } from "../service/user.service.js";

// Initialize Prisma Client for transaction handling
const prisma = new PrismaClient();

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
          profileImageUrl: result.profileImageUrl,
          role: result.role,
          status: result.status,
          phone: result.phone,
          qualification: result.qualification,
          address: result.address,
          dob: result.dob,
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
      200
    );
  }
);

export const registerUser = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as UserRegistrationRequest;

    if (!data.email || !data.name) {
      return errorHandle("Email and name are required.", reply, 400);
    }

    // Validate DOB if provided
    let dobDate: Date | null = null;
    if (data.dob) {
      if (!isValidDateFormat(data.dob) && !isValidISOFormat(data.dob)) {
        return errorHandle(
          "Invalid date format. Please use YYYY-MM-DD or ISO format.",
          reply,
          400
        );
      }

      dobDate = convertToDateTime(data.dob) ?? null;
      if (!dobDate) {
        return errorHandle(
          "Invalid date provided for date of birth.",
          reply,
          400
        );
      }

      // Validate DOB is not in the future
      if (dobDate > new Date()) {
        return errorHandle(
          "Date of birth cannot be in the future.",
          reply,
          400
        );
      }

      // Validate reasonable age (between 5 and 120 years)
      const age = new Date().getFullYear() - dobDate.getFullYear();
      if (age < 5 || age > 120) {
        return errorHandle("Please provide a valid date of birth.", reply, 400);
      }
    }

    const tempPassword = "defaultPassword123"; // Temporary password

    const [checkUser, hashedPassword] = await Promise.all([
      getUserByEmail(data.email),
      bcryptjs.hash(tempPassword, 10),
    ]);

    if (checkUser) {
      return errorHandle("User already exists with this email.", reply, 400);
    }

    const userData = {
      name: data.name,
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
      201
    );
  }
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
        403
      );
    }

    const isPasswordValid = await bcryptjs.compare(
      data.password,
      user.password
    );

    if (!isPasswordValid) {
      return errorHandle("Invalid password.", reply, 401);
    }

    const token = generToken(user.id);

    // Fetch full user details with role assignments for response
    const fullUserDetails = await getUserById(user.id);

    return successHandle(
      {
        message: "Login successful",
        token: token,
        user: fullUserDetails,
      },
      reply,
      200
    );
  }
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
      200
    );
  }
);

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
      email: string;
      name: string;
      rejectionReason?: string; // Added for rejection cases
      roleAssignments?: Array<{
        subRole: string;
        projectId?: string;
        centerId?: string;
        semesterId?: string;
        level?: string;
        committedDays?: string;
      }>;
    };

    console.log("Verifying user with data:", data);

    if (
      !data.userId ||
      !data.status ||
      !data.role ||
      !data.email ||
      !data.name
    ) {
      return errorHandle(
        "User ID, status, role, email, and name are required.",
        reply,
        400
      );
    }

    // Validate enum values
    if (!Object.values(UserStatus).includes(data.status)) {
      return errorHandle("Invalid status provided.", reply, 400);
    }

    if (!Object.values(Role).includes(data.role)) {
      return errorHandle("Invalid role provided.", reply, 400);
    }

    // Generate password: username + special symbol + 4 digit number
    const specialSymbols = ["@", "#", "$", "%", "&", "*", "!"];
    const randomSymbol =
      specialSymbols[Math.floor(Math.random() * specialSymbols.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 digit number
    const generatedPassword = `${data.name.replace(
      /\s+/g,
      ""
    )}${randomSymbol}${randomNumber}`;

    // Hash the generated password
    const hashedPassword = await bcryptjs.hash(generatedPassword, 10);

    // ============================================
    // STEP 1: HANDLE REJECTION CASE FIRST
    // ============================================
    if (data.status === "REJECTED") {
      console.log("🚫 Processing user rejection...");

      // Send rejection email first, then delete user
      try {
        // Always send a rejection email. Provide a default reason if one isn't given.
        const rejectionReason =
          data.rejectionReason ||
          "No specific reason was provided. Please contact an administrator for more details.";

        console.log(`📧 Sending rejection email to: ${data.email}`);

        const emailResult = await sendEmail(
          data.email,
          "Registration Update - Prangan Foundation",
          EMAIL_TEMPLATES.VERIFICATION_REJECTED.getTemplate({
            name: data.name,
            email: data.email,
            rejectionReason: rejectionReason,
          })
        );

        console.log(
          "✅ Rejection email sent successfully:",
          emailResult.messageId
        );

        // Delete the user from database
        await prisma.user.delete({
          where: { id: data.userId },
        });

        console.log("✅ User deleted successfully after rejection");

        return successHandle(
          {
            message:
              "User rejected and removed from system. Rejection email sent.",
            action: "rejected_and_deleted",
          },
          reply,
          200
        );
      } catch (error) {
        console.error("❌ Error handling user rejection:", error);
        return errorHandle(
          `Failed to process user rejection: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          reply,
          500
        );
      }
    }

    // ============================================
    // STEP 2: PERFORM DATABASE OPERATIONS FOR APPROVED USERS
    // ============================================
    console.log("🔄 Starting database transaction for approved user...");

    let updatedUser: any;
    let createdAssignments: any = null;

    try {
      // Wrap all database operations in a single transaction
      const transactionResult = await prisma.$transaction(async (tx) => {
        // Update user with new status, role, and hashed password
        const userUpdate = await tx.user.update({
          where: { id: data.userId },
          data: {
            status: data.status,
            role: data.role,
            password: hashedPassword,
          },
        });

        console.log("✅ User updated successfully in transaction");

        // If user role is USER and roleAssignments are provided, create them
        let assignmentsResult = null;
        if (
          data.role === Role.USER &&
          data.roleAssignments &&
          data.roleAssignments.length > 0
        ) {
          // Validate role assignments before processing
          for (const assignment of data.roleAssignments) {
            // Validate required fields
            if (!assignment.subRole) {
              throw new Error("SubRole is required for each role assignment.");
            }

            // Validate business rules
            if (assignment.level && assignment.subRole !== "EDUCATOR") {
              throw new Error(
                "Level can only be assigned to EDUCATOR sub-role."
              );
            }

            if (
              assignment.committedDays &&
              !["CENTER_MANAGER", "EDUCATOR"].includes(assignment.subRole)
            ) {
              throw new Error(
                "CommittedDays can only be assigned to CENTER_MANAGER or EDUCATOR sub-roles."
              );
            }
          }

          // Remove exact duplicates from role assignments
          const uniqueAssignments = [];
          const seenKeys = new Set();
          for (const assignment of data.roleAssignments) {
            const key = `${assignment.subRole}-${
              assignment.projectId || "null"
            }-${assignment.centerId || "null"}-${
              assignment.semesterId || "null"
            }`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueAssignments.push(assignment);
            } else {
              console.warn(`Duplicate assignment detected and skipped: ${key}`);
            }
          }

          // Deactivate all current assignments for this user
          await tx.userRoleAssignments.updateMany({
            where: { userId: data.userId, isActive: true },
            data: { isActive: false },
          });

          // Create new assignments
          const createdAssignmentsList = [];
          for (const assignment of uniqueAssignments) {
            const created = await tx.userRoleAssignments.create({
              data: {
                userId: data.userId,
                subRole: assignment.subRole as SubRole,
                projectId: assignment.projectId || null,
                centerId: assignment.centerId || null,
                semesterId: assignment.semesterId || null,
                level: assignment.level ? (assignment.level as Level) : null,
                committedDays: assignment.committedDays
                  ? (assignment.committedDays as CommittedDays)
                  : null,
              },
              include: {
                project: { select: { id: true, name: true } },
                center: { select: { id: true, name: true } },
                semester: { select: { id: true, name: true } },
              },
            });
            createdAssignmentsList.push(created);
          }

          assignmentsResult = createdAssignmentsList;
          console.log(
            "✅ Role assignments created successfully in transaction"
          );
        }

        return { userUpdate, assignmentsResult };
      });

      updatedUser = transactionResult.userUpdate;
      createdAssignments = transactionResult.assignmentsResult;

      console.log(
        "🎉 All database operations completed successfully in transaction"
      );
    } catch (transactionError) {
      console.error("❌ Database transaction failed:", transactionError);
      return errorHandle(
        `Database operation failed: ${
          transactionError instanceof Error
            ? transactionError.message
            : "Unknown error"
        }`,
        reply,
        500
      );
    }

    // ============================================
    // STEP 2: PREPARE EMAIL CONTENT WITH ROLE DETAILS
    // ============================================
    console.log("📧 Preparing email content...");

    // Fetch role assignment details for email if assignments were created
    let roleAssignmentDetails = "";
    if (
      data.role === Role.USER &&
      data.roleAssignments &&
      data.roleAssignments.length > 0
    ) {
      try {
        const assignmentDetailsPromises = data.roleAssignments.map(
          async (assignment) => {
            // Map sub-role to user-friendly names
            const roleNames: { [key: string]: string } = {
              TRAINING_DEVELOPMENT: "Training & Development",
              RECRUITMENT: "Recruitment",
              GROWTH_DEVELOPMENT: "Growth & Development",
              CURRICULUM_MENTOR: "Curriculum Mentor",
              TECH: "Technology",
              CENTER_MANAGER: "Center Manager",
              EDUCATOR: "Educator",
            };

            const roleName =
              roleNames[assignment.subRole] ||
              assignment.subRole.replace(/_/g, " ");

            let details = `
            <div class="role-assignment">
              <h4>🎯 ${roleName}</h4>
          `;

            // Fetch project details if projectId is provided
            if (assignment.projectId) {
              const project = await getProjectById(assignment.projectId);
              if (project && typeof project !== "string") {
                details += `<p><strong>📋 Project:</strong> ${project.name}</p>`;
              }
            }

            // Fetch center details if centerId is provided
            if (assignment.centerId) {
              const center = await getCenterById(assignment.centerId);
              if (center && typeof center !== "string") {
                details += `<p><strong>🏢 Center:</strong> ${center.name}</p>`;
              }
            }

            // Fetch semester details if semesterId is provided
            if (assignment.semesterId) {
              const semester = await getSemesterById(assignment.semesterId);
              if (semester && typeof semester !== "string") {
                const startDate = new Date(
                  semester.startDate
                ).toLocaleDateString();
                const endDate = new Date(semester.endDate).toLocaleDateString();
                details += `<p><strong>📅 Semester:</strong> ${semester.name} (${startDate} - ${endDate})</p>`;
              }
            }

            // Add level for EDUCATOR role
            if (assignment.level && assignment.subRole === "EDUCATOR") {
              const levelNames: { [key: string]: string } = {
                LEVEL_1: "Level 1",
                LEVEL_2: "Level 2",
                LEVEL_3: "Level 3",
                LEVEL_4: "Level 4",
                PRIMARY_A: "Primary A",
                PRIMARY_B: "Primary B",
              };
              const levelName =
                levelNames[assignment.level] ||
                assignment.level.replace(/_/g, " ");
              details += `<p><strong>📚 Teaching Level:</strong> ${levelName}</p>`;
            }

            // Add committed days for CENTER_MANAGER and EDUCATOR roles
            if (
              assignment.committedDays &&
              ["CENTER_MANAGER", "EDUCATOR"].includes(assignment.subRole)
            ) {
              const daysText =
                assignment.committedDays === "BOTH"
                  ? "Saturday & Sunday"
                  : assignment.committedDays === "SATURDAY"
                  ? "Saturday"
                  : "Sunday";
              details += `<p><strong>📅 Committed Days:</strong> ${daysText}</p>`;
            }

            details += `</div>`;
            return details;
          }
        );

        const assignmentDetailsArray = await Promise.all(
          assignmentDetailsPromises
        );

        const assignmentCount = data.roleAssignments.length;
        const introText =
          assignmentCount === 1
            ? "You have been assigned the following position:"
            : `You have been assigned the following ${assignmentCount} positions:`;

        roleAssignmentDetails = `
          <div class="credentials">
            <h3>👥 Your Role Assignments</h3>
            <p>${introText}</p>
            ${assignmentDetailsArray.join("")}
            <p style="margin-top: 15px; font-style: italic; color: #666;">
              ${
                assignmentCount === 1
                  ? "This position comes"
                  : "These positions come"
              } with specific responsibilities and access levels within the Prangan Foundation system.
            </p>
          </div>
        `;
      } catch (error) {
        console.error(
          "Error fetching role assignment details for email:",
          error
        );
        // Continue without role details if there's an error
      }
    }

    // ============================================
    // STEP 3: SEND EMAIL NOTIFICATION BASED ON STATUS
    // ============================================
    try {
      if (data.status === "APPROVED") {
        console.log(`📧 Sending verification success email to: ${data.email}`);

        // Prepare role assignment details for email if available
        let roleAssignmentDetails = "";
        if (
          data.role === Role.USER &&
          data.roleAssignments &&
          data.roleAssignments.length > 0
        ) {
          try {
            const assignmentDetailsPromises = data.roleAssignments.map(
              async (assignment) => {
                // Map sub-role to user-friendly names
                const roleNames: { [key: string]: string } = {
                  TRAINING_DEVELOPMENT: "Training & Development",
                  RECRUITMENT: "Recruitment",
                  GROWTH_DEVELOPMENT: "Growth & Development",
                  CURRICULUM_MENTOR: "Curriculum Mentor",
                  TECH: "Technology",
                  CENTER_MANAGER: "Center Manager",
                  EDUCATOR: "Educator",
                };

                const roleName =
                  roleNames[assignment.subRole] ||
                  assignment.subRole.replace(/_/g, " ");

                let details = `
                <div class="role-assignment">
                  <h4>🎯 ${roleName}</h4>
              `;

                // Fetch project details if projectId is provided
                if (assignment.projectId) {
                  const project = await getProjectById(assignment.projectId);
                  if (
                    project &&
                    typeof project === "object" &&
                    "name" in project
                  ) {
                    details += `<p><strong>📂 Project:</strong> ${project.name}</p>`;
                  }
                }

                // Fetch center details if centerId is provided
                if (assignment.centerId) {
                  const center = await getCenterById(assignment.centerId);
                  if (
                    center &&
                    typeof center === "object" &&
                    "name" in center
                  ) {
                    details += `<p><strong>🏢 Center:</strong> ${center.name}</p>`;
                  }
                }

                // Fetch semester details if semesterId is provided
                if (assignment.semesterId) {
                  const semester = await getSemesterById(assignment.semesterId);
                  if (
                    semester &&
                    typeof semester === "object" &&
                    "name" in semester
                  ) {
                    details += `<p><strong>📅 Semester:</strong> ${semester.name}</p>`;
                  }
                }

                // Add level if provided
                if (assignment.level) {
                  const levelNames: { [key: string]: string } = {
                    LEVEL_1: "Level 1",
                    LEVEL_2: "Level 2",
                    LEVEL_3: "Level 3",
                    LEVEL_4: "Level 4",
                    PRIMARY_A: "Primary A",
                    PRIMARY_B: "Primary B",
                  };
                  details += `<p><strong>📊 Level:</strong> ${
                    levelNames[assignment.level] || assignment.level
                  }</p>`;
                }

                // Add committed days if provided
                if (assignment.committedDays) {
                  const daysNames: { [key: string]: string } = {
                    WEEKDAYS: "Weekdays",
                    WEEKENDS: "Weekends",
                    DAILY: "Daily",
                    FLEXIBLE: "Flexible",
                  };
                  details += `<p><strong>🗓️ Committed Days:</strong> ${
                    daysNames[assignment.committedDays] ||
                    assignment.committedDays
                  }</p>`;
                }

                details += `</div>`;
                return details;
              }
            );

            const assignmentDetailsArray = await Promise.all(
              assignmentDetailsPromises
            );

            const assignmentCount = data.roleAssignments.length;
            const introText =
              assignmentCount === 1
                ? "You have been assigned the following position:"
                : `You have been assigned the following ${assignmentCount} positions:`;

            roleAssignmentDetails = `
              <div class="credentials">
                <h3>👥 Your Role Assignments</h3>
                <p>${introText}</p>
                ${assignmentDetailsArray.join("")}
                <p style="margin-top: 15px; font-style: italic; color: #666;">
                  ${
                    assignmentCount === 1
                      ? "This position comes"
                      : "These positions come"
                  } with specific responsibilities and access levels within the Prangan Foundation system.
                </p>
              </div>
            `;
          } catch (error) {
            console.error(
              "Error fetching role assignment details for email:",
              error
            );
            // Continue without role details if there's an error
          }
        }

        try {
          const emailResult = await sendEmail(
            data.email,
            "🎉 Account Verification - Welcome to Prangan Foundation",
            EMAIL_TEMPLATES.VERIFICATION_SUCCESS.getTemplate({
              name: data.name,
              email: data.email,
              generatedPassword: generatedPassword,
              status: data.status,
              roleAssignmentDetails: roleAssignmentDetails,
            })
          );

          console.log(
            "✅ Verification email sent successfully:",
            emailResult.messageId
          );
        } catch (emailError) {
          console.error("❌ Failed to send email:", emailError);
          // Note: We don't return an error here since the user was successfully created
          // Just log the email failure - the main operation succeeded
          console.log(
            "⚠️ User verification completed successfully, but email notification failed"
          );
        }
      }
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);
      // Note: We don't return an error here since the user was successfully created
      // Just log the email failure - the main operation succeeded
      console.log(
        "⚠️ User verification completed successfully, but email notification failed"
      );
    }

    // Fetch full user details with role assignments for response
    const fullUserDetails = await getUserById(updatedUser.id);

    return successHandle(
      {
        message:
          "User verification completed successfully and notification email sent",
        user: fullUserDetails,
        roleAssignments: createdAssignments,
      },
      reply,
      200
    );
  }
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
      200
    );
  }
);

// Student Controllers
export const addStudent = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as {
      name: string;
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
      enrollment?: {
        centerId: string;
        semesterId: string;
        projectId: string;
        level: Level;
      };
    };

    if (!data.name) {
      return errorHandle("Name is required.", reply, 400);
    }

    // Validate enrollment data if provided
    if (data.enrollment) {
      if (
        !data.enrollment.centerId ||
        !data.enrollment.semesterId ||
        !data.enrollment.projectId ||
        !data.enrollment.level
      ) {
        return errorHandle(
          "All enrollment fields (centerId, semesterId, projectId, level) are required when enrollment is provided.",
          reply,
          400
        );
      }

      // Validate level enum
      if (!Object.values(Level).includes(data.enrollment.level)) {
        return errorHandle("Invalid level provided in enrollment.", reply, 400);
      }
    }

    // Validate DOB if provided
    let dobDate: Date | null = null;
    if (data.dob) {
      if (!isValidDateFormat(data.dob) && !isValidISOFormat(data.dob)) {
        return errorHandle(
          "Invalid date format for DOB. Please use YYYY-MM-DD or ISO format.",
          reply,
          400
        );
      }

      dobDate = convertToDateTime(data.dob) ?? null;
      if (!dobDate) {
        return errorHandle(
          "Invalid date provided for date of birth.",
          reply,
          400
        );
      }

      // Validate DOB is not in the future
      if (dobDate > new Date()) {
        return errorHandle(
          "Date of birth cannot be in the future.",
          reply,
          400
        );
      }

      // Validate reasonable age for students (between 3 and 25 years)
      const age = new Date().getFullYear() - dobDate.getFullYear();
      if (age < 3 || age > 25) {
        return errorHandle(
          "Please provide a valid date of birth for the student.",
          reply,
          400
        );
      }
    }

    const studentData = {
      name: data.name,
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
    };

    const student = await createStudent(studentData);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
    }

    // If enrollment data is provided, enroll the student
    let enrollment = null;
    if (data.enrollment) {
      enrollment = await enrollStudent({
        studentId: student.id,
        centerId: data.enrollment.centerId,
        semesterId: data.enrollment.semesterId,
        projectId: data.enrollment.projectId,
        level: data.enrollment.level,
      });

      if (typeof enrollment === "string") {
        return errorHandle(
          `Student created but enrollment failed: ${enrollment}`,
          reply,
          500
        );
      }
    }

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
      201
    );
  }
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
      200
    );
  }
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

    const student = await getStudentById(id);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
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
      200
    );
  }
);

export const updateStudentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const data = request.body as {
      name?: string;
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

    // Validate enrollment level if provided
    if (
      data.enrollment?.level &&
      !Object.values(Level).includes(data.enrollment.level)
    ) {
      return errorHandle("Invalid level provided in enrollment.", reply, 400);
    }

    const updateData: any = {};

    if (data.name) updateData.name = data.name;

    // Handle DOB update
    if (data.dob !== undefined) {
      if (data.dob === "" || data.dob === null) {
        updateData.dob = null;
      } else {
        if (!isValidDateFormat(data.dob) && !isValidISOFormat(data.dob)) {
          return errorHandle(
            "Invalid date format for DOB. Please use YYYY-MM-DD or ISO format.",
            reply,
            400
          );
        }

        const dobDate = convertToDateTime(data.dob) ?? null;
        if (!dobDate) {
          return errorHandle(
            "Invalid date provided for date of birth.",
            reply,
            400
          );
        }

        // Validate DOB is not in the future
        if (dobDate > new Date()) {
          return errorHandle(
            "Date of birth cannot be in the future.",
            reply,
            400
          );
        }

        // Validate reasonable age for students (between 3 and 25 years)
        const age = new Date().getFullYear() - dobDate.getFullYear();
        if (age < 3 || age > 25) {
          return errorHandle(
            "Please provide a valid date of birth for the student.",
            reply,
            400
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

    const student = await updateStudent(id, updateData);

    if (typeof student === "string") {
      return errorHandle(student, reply, 500);
    }

    // Handle enrollment updates if provided
    let enrollmentResult = null;
    if (data.enrollment) {
      // If level is provided, promote the student
      if (data.enrollment.level) {
        enrollmentResult = await promoteStudent(
          id,
          data.enrollment.level,
          data.enrollment.centerId
        );
      }
      // If other enrollment fields are provided without level, we could add logic to update current enrollment
      // For now, we'll focus on level promotion as the main use case
    }

    const responseMessage = data.enrollment?.level
      ? "Student updated and promoted successfully"
      : "Student updated successfully. Use enrollment endpoints to update level assignments.";

    return successHandle(
      {
        message: responseMessage,
        student: student,
        enrollment: enrollmentResult,
      },
      reply,
      200
    );
  }
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
      return errorHandle(result, reply, 500);
    }

    return successHandle(
      {
        message: "Student deleted successfully",
      },
      reply,
      200
    );
  }
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
      200
    );
  }
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
      200
    );
  }
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
      200
    );
  }
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
      200
    );
  }
);

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
      level: Level;
    };

    if (
      !data.studentId ||
      !data.centerId ||
      !data.semesterId ||
      !data.projectId ||
      !data.level
    ) {
      return errorHandle("All enrollment fields are required.", reply, 400);
    }

    // Validate level enum
    if (!Object.values(Level).includes(data.level)) {
      return errorHandle("Invalid level provided.", reply, 400);
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
      201
    );
  }
);

export const promoteStudentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user || user.role !== Role.ADMIN) {
      return errorHandle("Only admins can promote students.", reply, 403);
    }

    const { studentId } = request.params as { studentId: string };
    const data = request.body as {
      newLevel: Level;
      newCenterId?: string;
    };

    if (!studentId) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    if (!data.newLevel) {
      return errorHandle("New level is required.", reply, 400);
    }

    // Validate level enum
    if (!Object.values(Level).includes(data.newLevel)) {
      return errorHandle("Invalid level provided.", reply, 400);
    }

    const promotion = await promoteStudent(
      studentId,
      data.newLevel,
      data.newCenterId
    );

    if (typeof promotion === "string") {
      return errorHandle(promotion, reply, 500);
    }

    return successHandle(
      {
        message: "Student promoted successfully",
        enrollment: promotion,
      },
      reply,
      200
    );
  }
);

export const getStudentHistoryController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return errorHandle("Unauthorized access.", reply, 401);
    }

    const { studentId } = request.params as { studentId: string };

    if (!studentId) {
      return errorHandle("Student ID is required.", reply, 400);
    }

    const history = await getStudentHistory(studentId);

    if (typeof history === "string") {
      return errorHandle(history, reply, 500);
    }

    return successHandle(
      {
        message: "Student history retrieved successfully",
        history: history,
      },
      reply,
      200
    );
  }
);

// User Management Controllers
export const getAllUsersController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
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
      200
    );
  }
);

export const getUserAssignmentsController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle(
        "Only admins can access user assignments.",
        reply,
        403
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
      200
    );
  }
);

export const updateUserManagementController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle("Only admins can update user management.", reply, 403);
    }

    const { userId } = request.params as { userId: string };
    const data = request.body as {
      roleAssignments: Array<{
        subRole: string;
        projectId?: string;
        centerId?: string;
        semesterId?: string;
        level?: string;
        committedDays?: string;
      }>;
    };

    if (!userId) {
      return errorHandle("User ID is required.", reply, 400);
    }

    if (!data.roleAssignments || !Array.isArray(data.roleAssignments)) {
      return errorHandle("Role assignments array is required.", reply, 400);
    }

    // Validate each assignment
    for (const assignment of data.roleAssignments) {
      if (!assignment.subRole) {
        return errorHandle(
          "Sub-role is required for each assignment.",
          reply,
          400
        );
      }

      // Validate that level and committedDays are only set for appropriate roles
      if (assignment.level && assignment.subRole !== "EDUCATOR") {
        return errorHandle(
          "Level can only be set for EDUCATOR sub-role.",
          reply,
          400
        );
      }

      if (
        assignment.committedDays &&
        !["CENTER_MANAGER", "EDUCATOR"].includes(assignment.subRole)
      ) {
        return errorHandle(
          "CommittedDays can only be set for CENTER_MANAGER and EDUCATOR sub-roles.",
          reply,
          400
        );
      }
    }

    const updatedAssignments = await bulkUpdateUserAssignments(
      userId,
      data.roleAssignments
    );

    if (typeof updatedAssignments === "string") {
      return errorHandle(updatedAssignments, reply, 500);
    }

    return successHandle(
      {
        message: "User assignments updated successfully",
        assignments: updatedAssignments,
      },
      reply,
      200
    );
  }
);

export const createUserAssignmentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle(
        "Only admins can create user assignments.",
        reply,
        403
      );
    }

    const data = request.body as {
      userId: string;
      subRole: string;
      projectId?: string;
      centerId?: string;
      semesterId?: string;
      level?: string;
      committedDays?: string;
    };

    if (!data.userId || !data.subRole) {
      return errorHandle("User ID and sub-role are required.", reply, 400);
    }

    // Validate business rules
    if (data.level && data.subRole !== "EDUCATOR") {
      return errorHandle(
        "Level can only be set for EDUCATOR sub-role.",
        reply,
        400
      );
    }

    if (
      data.committedDays &&
      !["CENTER_MANAGER", "EDUCATOR"].includes(data.subRole)
    ) {
      return errorHandle(
        "CommittedDays can only be set for CENTER_MANAGER and EDUCATOR sub-roles.",
        reply,
        400
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
      201
    );
  }
);

export const deleteUserAssignmentController = asyncHandle(
  async (request: FastifyRequest, reply: FastifyReply) => {
    const admin = request.user;
    if (!admin || admin.role !== Role.ADMIN) {
      return errorHandle(
        "Only admins can delete user assignments.",
        reply,
        403
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
      200
    );
  }
);
