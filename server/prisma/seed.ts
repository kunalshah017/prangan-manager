import {
  PrismaClient,
  Role,
  UserStatus,
  ProjectStatus,
  SubRole,
  Level,
  CommittedDays,
  type Prisma,
} from "../generated/prisma/index.js";
import bcrypt from "bcryptjs";
import { resolvePersonNameCreate } from "../lib/person-name.js";
import {
  assertDestructiveLocalSeedAllowed,
  getDevelopmentSeedPassword,
} from "./seed-safety.js";

async function seedFixtures(
  prisma: PrismaClient,
  seedPassword: string,
): Promise<void> {
  console.log("🌱 Starting database seeding...");

  console.log("🧹 Clearing existing data...");
  await prisma.$transaction(async (transaction) => {
    await transaction.studentAttendance.deleteMany();
    await transaction.studentExamScore.deleteMany();
    await transaction.studentEnrollments.deleteMany();
    await transaction.students.deleteMany();
    await transaction.userRoleAssignments.deleteMany();
    await transaction.semesters.deleteMany();
    await transaction.centers.deleteMany();
    await transaction.projects.deleteMany();
    await transaction.user.deleteMany();
  });

  // Hash passwords
  const adminPassword = await bcrypt.hash(seedPassword, 10);
  const userPassword = await bcrypt.hash(seedPassword, 10);
  const createFixtureUser = (args: Prisma.UserCreateArgs) =>
    prisma.user.create({
      ...args,
      data: {
        ...args.data,
        ...resolvePersonNameCreate({ name: args.data.name }),
      },
    });
  const createFixtureStudent = (args: Prisma.StudentsCreateArgs) =>
    prisma.students.create({
      ...args,
      data: {
        ...args.data,
        ...resolvePersonNameCreate({ name: args.data.name }),
      },
    });

  // Create Projects
  console.log("📁 Creating projects...");
  const projects = await Promise.all([
    prisma.projects.create({
      data: {
        name: "Chanchalmann",
        description: "Project Description",
        projectType: "Education",
        imageUrl: "https://example.com/project.jpg",
        status: ProjectStatus.ACTIVE,
        metadata: {
          type: "Education",
          duration: "Annual",
        },
      },
    }),
  ]);

  // Create Centers
  console.log("🏢 Creating centers...");
  const centers = await Promise.all([
    prisma.centers.create({
      data: {
        name: "Tulip",
        address: "Dombivli, Maharashtra",
        projectId: projects[0].id,
        metadata: {
          description: "Center Description",
          capacity: 50,
        },
      },
    }),
    prisma.centers.create({
      data: {
        name: "Lavender",
        address: "Dombivli, Maharashtra",
        projectId: projects[0].id,
        metadata: {
          description: "Center Description",
          capacity: 40,
        },
      },
    }),
  ]);

  // Create Semesters
  console.log("📅 Creating semesters...");
  const semesters = await Promise.all([
    // Tulip Center Semester
    prisma.semesters.create({
      data: {
        name: "Semester 2025-26",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2026-03-31"),
        centerId: centers[0].id,
      },
    }),
    // Lavender Center Semester
    prisma.semesters.create({
      data: {
        name: "Semester 2025-26",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2026-03-31"),
        centerId: centers[1].id,
      },
    }),
  ]);

  // Create Users
  console.log("👥 Creating users...");
  const users = await Promise.all([
    // Admin Users
    createFixtureUser({
      data: {
        email: "pranganfoundationindia@gmail.com",
        name: "Admin User 1",
        password: adminPassword,
        role: Role.ADMIN,
        status: UserStatus.APPROVED,
        phone: "+91 9876543200",
        dob: new Date("1985-05-15"),
        qualification: "MBA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/admin1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "admin2@chanchalmann.org",
        name: "Admin User 2",
        password: adminPassword,
        role: Role.ADMIN,
        status: UserStatus.APPROVED,
        phone: "+91 9876543201",
        dob: new Date("1986-08-20"),
        qualification: "Masters",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/admin2.jpg",
      },
    }),
    // Center Managers
    createFixtureUser({
      data: {
        email: "manager1@chanchalmann.org",
        name: "Center Manager 1",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543202",
        dob: new Date("1988-03-20"),
        qualification: "MBA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/manager1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "manager2@chanchalmann.org",
        name: "Center Manager 2",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543203",
        dob: new Date("1987-07-10"),
        qualification: "MSW",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/manager2.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "manager3@chanchalmann.org",
        name: "Center Manager 3",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543204",
        dob: new Date("1989-11-15"),
        qualification: "Masters",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/manager3.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "manager4@chanchalmann.org",
        name: "Center Manager 4",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543205",
        dob: new Date("1990-02-28"),
        qualification: "MBA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/manager4.jpg",
      },
    }),
    // Tulip Center Educators (10 educators)
    createFixtureUser({
      data: {
        email: "educator1@chanchalmann.org",
        name: "Educator 1",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543206",
        dob: new Date("1990-01-15"),
        qualification: "BEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator2@chanchalmann.org",
        name: "Educator 2",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543207",
        dob: new Date("1991-02-20"),
        qualification: "MEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator2.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator3@chanchalmann.org",
        name: "Educator 3",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543208",
        dob: new Date("1992-03-25"),
        qualification: "BA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator3.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator4@chanchalmann.org",
        name: "Educator 4",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543209",
        dob: new Date("1993-04-30"),
        qualification: "BSc",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator4.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator5@chanchalmann.org",
        name: "Educator 5",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543210",
        dob: new Date("1994-05-10"),
        qualification: "BEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator5.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator6@chanchalmann.org",
        name: "Educator 6",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543211",
        dob: new Date("1989-06-15"),
        qualification: "MSc",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator6.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator7@chanchalmann.org",
        name: "Educator 7",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543212",
        dob: new Date("1995-07-20"),
        qualification: "BA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator7.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator8@chanchalmann.org",
        name: "Educator 8",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543213",
        dob: new Date("1988-08-25"),
        qualification: "BEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator8.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator9@chanchalmann.org",
        name: "Educator 9",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543214",
        dob: new Date("1996-09-30"),
        qualification: "MEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator9.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator10@chanchalmann.org",
        name: "Educator 10",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543215",
        dob: new Date("1987-10-05"),
        qualification: "BSc",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator10.jpg",
      },
    }),
    // Lavender Center Educators (10 educators)
    createFixtureUser({
      data: {
        email: "educator11@chanchalmann.org",
        name: "Educator 11",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543216",
        dob: new Date("1990-11-10"),
        qualification: "BEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator11.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator12@chanchalmann.org",
        name: "Educator 12",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543217",
        dob: new Date("1991-12-15"),
        qualification: "MEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator12.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator13@chanchalmann.org",
        name: "Educator 13",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543218",
        dob: new Date("1992-01-20"),
        qualification: "BA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator13.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator14@chanchalmann.org",
        name: "Educator 14",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543219",
        dob: new Date("1993-02-25"),
        qualification: "BSc",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator14.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator15@chanchalmann.org",
        name: "Educator 15",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543220",
        dob: new Date("1994-03-30"),
        qualification: "BEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator15.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator16@chanchalmann.org",
        name: "Educator 16",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543221",
        dob: new Date("1989-04-05"),
        qualification: "MSc",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator16.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator17@chanchalmann.org",
        name: "Educator 17",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543222",
        dob: new Date("1995-05-10"),
        qualification: "BA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator17.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator18@chanchalmann.org",
        name: "Educator 18",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543223",
        dob: new Date("1988-06-15"),
        qualification: "BEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator18.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator19@chanchalmann.org",
        name: "Educator 19",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543224",
        dob: new Date("1996-07-20"),
        qualification: "MEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator19.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "educator20@chanchalmann.org",
        name: "Educator 20",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543225",
        dob: new Date("1987-08-25"),
        qualification: "BSc",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/educator20.jpg",
      },
    }),
    // Other roles - 2 of each
    // Training Development
    createFixtureUser({
      data: {
        email: "training1@chanchalmann.org",
        name: "Training Staff 1",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543226",
        dob: new Date("1985-09-10"),
        qualification: "Masters",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/training1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "training2@chanchalmann.org",
        name: "Training Staff 2",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543227",
        dob: new Date("1986-10-15"),
        qualification: "MBA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/training2.jpg",
      },
    }),
    // Recruitment
    createFixtureUser({
      data: {
        email: "recruitment1@chanchalmann.org",
        name: "Recruitment Staff 1",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543228",
        dob: new Date("1987-11-20"),
        qualification: "MBA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/recruitment1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "recruitment2@chanchalmann.org",
        name: "Recruitment Staff 2",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543229",
        dob: new Date("1988-12-25"),
        qualification: "Masters",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/recruitment2.jpg",
      },
    }),
    // Growth Development
    createFixtureUser({
      data: {
        email: "growth1@chanchalmann.org",
        name: "Growth Staff 1",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543230",
        dob: new Date("1989-01-30"),
        qualification: "MSW",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/growth1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "growth2@chanchalmann.org",
        name: "Growth Staff 2",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543231",
        dob: new Date("1990-02-05"),
        qualification: "Masters",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/growth2.jpg",
      },
    }),
    // Curriculum Mentor
    createFixtureUser({
      data: {
        email: "curriculum1@chanchalmann.org",
        name: "Curriculum Mentor 1",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543232",
        dob: new Date("1991-03-10"),
        qualification: "MEd",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/curriculum1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "curriculum2@chanchalmann.org",
        name: "Curriculum Mentor 2",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543233",
        dob: new Date("1992-04-15"),
        qualification: "PhD",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/curriculum2.jpg",
      },
    }),
    // Tech
    createFixtureUser({
      data: {
        email: "tech1@chanchalmann.org",
        name: "Tech Staff 1",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543234",
        dob: new Date("1993-05-20"),
        qualification: "BTech",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/tech1.jpg",
      },
    }),
    createFixtureUser({
      data: {
        email: "tech2@chanchalmann.org",
        name: "Tech Staff 2",
        password: userPassword,
        role: Role.USER,
        status: UserStatus.APPROVED,
        phone: "+91 9876543235",
        dob: new Date("1994-06-25"),
        qualification: "MCA",
        address: "Dombivli, Maharashtra",
        profileImageUrl: "https://example.com/tech2.jpg",
      },
    }),
  ]);

  // Create User Role Assignments
  console.log("🎭 Creating user role assignments...");
  await Promise.all([
    // Center Managers
    prisma.userRoleAssignments.create({
      data: {
        userId: users[2].id, // Center Manager 1
        subRole: SubRole.CENTER_MANAGER,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[3].id, // Center Manager 2
        subRole: SubRole.CENTER_MANAGER,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[4].id, // Center Manager 3
        subRole: SubRole.CENTER_MANAGER,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        committedDays: CommittedDays.SATURDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[5].id, // Center Manager 4
        subRole: SubRole.CENTER_MANAGER,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        committedDays: CommittedDays.SUNDAY,
      },
    }),
    // Tulip Center Educators (10 educators with different committed days and levels)
    prisma.userRoleAssignments.create({
      data: {
        userId: users[6].id, // Educator 1
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_1,
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[7].id, // Educator 2
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_2,
        committedDays: CommittedDays.SATURDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[8].id, // Educator 3
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_3,
        committedDays: CommittedDays.SUNDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[9].id, // Educator 4
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_4,
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[10].id, // Educator 5
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.PRIMARY_A,
        committedDays: CommittedDays.SATURDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[11].id, // Educator 6
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.PRIMARY_B,
        committedDays: CommittedDays.SUNDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[12].id, // Educator 7
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_1,
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[13].id, // Educator 8
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_2,
        committedDays: CommittedDays.SATURDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[14].id, // Educator 9
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_3,
        committedDays: CommittedDays.SUNDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[15].id, // Educator 10
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[0].id, // Tulip
        projectId: projects[0].id,
        semesterId: semesters[0].id, // Tulip semester
        level: Level.LEVEL_4,
        committedDays: CommittedDays.BOTH,
      },
    }),
    // Lavender Center Educators (10 educators with different committed days and levels)
    prisma.userRoleAssignments.create({
      data: {
        userId: users[16].id, // Educator 11
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_1,
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[17].id, // Educator 12
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_2,
        committedDays: CommittedDays.SATURDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[18].id, // Educator 13
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_3,
        committedDays: CommittedDays.SUNDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[19].id, // Educator 14
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_4,
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[20].id, // Educator 15
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.PRIMARY_A,
        committedDays: CommittedDays.SATURDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[21].id, // Educator 16
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.PRIMARY_B,
        committedDays: CommittedDays.SUNDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[22].id, // Educator 17
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_1,
        committedDays: CommittedDays.BOTH,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[23].id, // Educator 18
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_2,
        committedDays: CommittedDays.SATURDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[24].id, // Educator 19
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_3,
        committedDays: CommittedDays.SUNDAY,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[25].id, // Educator 20
        subRole: SubRole.EDUCATOR,
        isActive: true,
        centerId: centers[1].id, // Lavender
        projectId: projects[0].id,
        semesterId: semesters[1].id, // Lavender semester
        level: Level.LEVEL_4,
        committedDays: CommittedDays.BOTH,
      },
    }),
    // Other roles assignments
    prisma.userRoleAssignments.create({
      data: {
        userId: users[26].id, // Training Staff 1
        subRole: SubRole.TRAINING_DEVELOPMENT,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[27].id, // Training Staff 2
        subRole: SubRole.TRAINING_DEVELOPMENT,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[28].id, // Recruitment Staff 1
        subRole: SubRole.RECRUITMENT,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[29].id, // Recruitment Staff 2
        subRole: SubRole.RECRUITMENT,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[30].id, // Growth Staff 1
        subRole: SubRole.GROWTH_DEVELOPMENT,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[31].id, // Growth Staff 2
        subRole: SubRole.GROWTH_DEVELOPMENT,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[32].id, // Curriculum Mentor 1
        subRole: SubRole.CURRICULUM_MENTOR,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[33].id, // Curriculum Mentor 2
        subRole: SubRole.CURRICULUM_MENTOR,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[34].id, // Tech Staff 1
        subRole: SubRole.TECH,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
    prisma.userRoleAssignments.create({
      data: {
        userId: users[35].id, // Tech Staff 2
        subRole: SubRole.TECH,
        isActive: true,
        projectId: projects[0].id,
      },
    }),
  ]);

  // Create Students with family details
  console.log("🎓 Creating students...");
  const students = await Promise.all([
    // LEVEL_1 Students (15 students) - Ages 14-16 (born 2009-2011)
    ...Array.from({ length: 15 }, (_, i) =>
      createFixtureStudent({
        data: {
          name: `Student L1 ${i + 1}`,
          phoneNumber: `+91 987654${String(1001 + i).padStart(4, "0")}`,
          dob: new Date(
            `${2009 + Math.floor(Math.random() * 3)}-${String(
              Math.floor(Math.random() * 12) + 1,
            ).padStart(2, "0")}-${String(
              Math.floor(Math.random() * 28) + 1,
            ).padStart(2, "0")}`,
          ),
          profileImageUrl: `https://example.com/student-l1-${i + 1}.jpg`,
          fatherName: `Father L1 ${i + 1}`,
          motherName: `Mother L1 ${i + 1}`,
          address: `Address ${i + 1}, Dombivli`,
          schoolName: `School ${i + 1}`,
          fatherOccupation: `Occupation ${i + 1}`,
          motherOccupation: "Homemaker",
          familyIncome: `${15000 + i * 1000}`,
        },
      }),
    ),
    // LEVEL_2 Students (15 students) - Ages 12-14 (born 2011-2013)
    ...Array.from({ length: 15 }, (_, i) =>
      createFixtureStudent({
        data: {
          name: `Student L2 ${i + 1}`,
          phoneNumber: `+91 987654${String(2001 + i).padStart(4, "0")}`,
          dob: new Date(
            `${2011 + Math.floor(Math.random() * 3)}-${String(
              Math.floor(Math.random() * 12) + 1,
            ).padStart(2, "0")}-${String(
              Math.floor(Math.random() * 28) + 1,
            ).padStart(2, "0")}`,
          ),
          profileImageUrl: `https://example.com/student-l2-${i + 1}.jpg`,
          fatherName: `Father L2 ${i + 1}`,
          motherName: `Mother L2 ${i + 1}`,
          address: `Address ${i + 16}, Dombivli`,
          schoolName: `School ${i + 16}`,
          fatherOccupation: `Occupation ${i + 16}`,
          motherOccupation: "Working",
          familyIncome: `${20000 + i * 1000}`,
        },
      }),
    ),
    // LEVEL_3 Students (15 students) - Ages 10-12 (born 2013-2015)
    ...Array.from({ length: 15 }, (_, i) =>
      createFixtureStudent({
        data: {
          name: `Student L3 ${i + 1}`,
          phoneNumber: `+91 987654${String(3001 + i).padStart(4, "0")}`,
          dob: new Date(
            `${2013 + Math.floor(Math.random() * 3)}-${String(
              Math.floor(Math.random() * 12) + 1,
            ).padStart(2, "0")}-${String(
              Math.floor(Math.random() * 28) + 1,
            ).padStart(2, "0")}`,
          ),
          profileImageUrl: `https://example.com/student-l3-${i + 1}.jpg`,
          fatherName: `Father L3 ${i + 1}`,
          motherName: `Mother L3 ${i + 1}`,
          address: `Address ${i + 31}, Dombivli`,
          schoolName: `School ${i + 31}`,
          fatherOccupation: `Occupation ${i + 31}`,
          motherOccupation: "Homemaker",
          familyIncome: `${25000 + i * 1000}`,
        },
      }),
    ),
    // LEVEL_4 Students (15 students) - Ages 8-10 (born 2015-2017)
    ...Array.from({ length: 15 }, (_, i) =>
      createFixtureStudent({
        data: {
          name: `Student L4 ${i + 1}`,
          phoneNumber: `+91 987654${String(4001 + i).padStart(4, "0")}`,
          dob: new Date(
            `${2015 + Math.floor(Math.random() * 3)}-${String(
              Math.floor(Math.random() * 12) + 1,
            ).padStart(2, "0")}-${String(
              Math.floor(Math.random() * 28) + 1,
            ).padStart(2, "0")}`,
          ),
          profileImageUrl: `https://example.com/student-l4-${i + 1}.jpg`,
          fatherName: `Father L4 ${i + 1}`,
          motherName: `Mother L4 ${i + 1}`,
          address: `Address ${i + 46}, Dombivli`,
          schoolName: `School ${i + 46}`,
          fatherOccupation: `Occupation ${i + 46}`,
          motherOccupation: "Working",
          familyIncome: `${30000 + i * 1000}`,
        },
      }),
    ),
    // PRIMARY_A Students (12 students) - Ages 6-8 (born 2017-2019)
    ...Array.from({ length: 12 }, (_, i) =>
      createFixtureStudent({
        data: {
          name: `Student PA ${i + 1}`,
          phoneNumber: `+91 987654${String(5001 + i).padStart(4, "0")}`,
          dob: new Date(
            `${2017 + Math.floor(Math.random() * 3)}-${String(
              Math.floor(Math.random() * 12) + 1,
            ).padStart(2, "0")}-${String(
              Math.floor(Math.random() * 28) + 1,
            ).padStart(2, "0")}`,
          ),
          profileImageUrl: `https://example.com/student-pa-${i + 1}.jpg`,
          fatherName: `Father PA ${i + 1}`,
          motherName: `Mother PA ${i + 1}`,
          address: `Address ${i + 61}, Dombivli`,
          schoolName: `Primary School ${i + 1}`,
          fatherOccupation: `Occupation ${i + 61}`,
          motherOccupation: "Homemaker",
          familyIncome: `${18000 + i * 800}`,
        },
      }),
    ),
    // PRIMARY_B Students (12 students) - Ages 4-6 (born 2019-2021)
    ...Array.from({ length: 12 }, (_, i) =>
      createFixtureStudent({
        data: {
          name: `Student PB ${i + 1}`,
          phoneNumber: `+91 987654${String(6001 + i).padStart(4, "0")}`,
          dob: new Date(
            `${2019 + Math.floor(Math.random() * 3)}-${String(
              Math.floor(Math.random() * 12) + 1,
            ).padStart(2, "0")}-${String(
              Math.floor(Math.random() * 28) + 1,
            ).padStart(2, "0")}`,
          ),
          profileImageUrl: `https://example.com/student-pb-${i + 1}.jpg`,
          fatherName: `Father PB ${i + 1}`,
          motherName: `Mother PB ${i + 1}`,
          address: `Address ${i + 73}, Dombivli`,
          schoolName: `Primary School ${i + 13}`,
          fatherOccupation: `Occupation ${i + 73}`,
          motherOccupation: "Working",
          familyIncome: `${22000 + i * 800}`,
        },
      }),
    ),
  ]);

  // Create Student Enrollments
  console.log("📝 Creating student enrollments...");
  const enrollments = [];

  // LEVEL_1 Students (7 in Tulip, 8 in Lavender)
  for (let i = 0; i < 15; i++) {
    const centerId = i < 7 ? centers[0].id : centers[1].id;
    const semesterId = i < 7 ? semesters[0].id : semesters[1].id;
    enrollments.push(
      prisma.studentEnrollments.create({
        data: {
          studentId: students[i].id,
          centerId: centerId,
          semesterId: semesterId,
          projectId: projects[0].id,
          level: Level.LEVEL_1,
          isActive: true,
        },
      }),
    );
  }

  // LEVEL_2 Students (8 in Tulip, 7 in Lavender)
  for (let i = 15; i < 30; i++) {
    const centerId = i < 23 ? centers[0].id : centers[1].id;
    const semesterId = i < 23 ? semesters[0].id : semesters[1].id;
    enrollments.push(
      prisma.studentEnrollments.create({
        data: {
          studentId: students[i].id,
          centerId: centerId,
          semesterId: semesterId,
          projectId: projects[0].id,
          level: Level.LEVEL_2,
          isActive: true,
        },
      }),
    );
  }

  // LEVEL_3 Students (7 in Tulip, 8 in Lavender)
  for (let i = 30; i < 45; i++) {
    const centerId = i < 37 ? centers[0].id : centers[1].id;
    const semesterId = i < 37 ? semesters[0].id : semesters[1].id;
    enrollments.push(
      prisma.studentEnrollments.create({
        data: {
          studentId: students[i].id,
          centerId: centerId,
          semesterId: semesterId,
          projectId: projects[0].id,
          level: Level.LEVEL_3,
          isActive: true,
        },
      }),
    );
  }

  // LEVEL_4 Students (8 in Tulip, 7 in Lavender)
  for (let i = 45; i < 60; i++) {
    const centerId = i < 53 ? centers[0].id : centers[1].id;
    const semesterId = i < 53 ? semesters[0].id : semesters[1].id;
    enrollments.push(
      prisma.studentEnrollments.create({
        data: {
          studentId: students[i].id,
          centerId: centerId,
          semesterId: semesterId,
          projectId: projects[0].id,
          level: Level.LEVEL_4,
          isActive: true,
        },
      }),
    );
  }

  // PRIMARY_A Students (6 in Tulip, 6 in Lavender)
  for (let i = 60; i < 72; i++) {
    const centerId = i < 66 ? centers[0].id : centers[1].id;
    const semesterId = i < 66 ? semesters[0].id : semesters[1].id;
    enrollments.push(
      prisma.studentEnrollments.create({
        data: {
          studentId: students[i].id,
          centerId: centerId,
          semesterId: semesterId,
          projectId: projects[0].id,
          level: Level.PRIMARY_A,
          isActive: true,
        },
      }),
    );
  }

  // PRIMARY_B Students (6 in Tulip, 6 in Lavender)
  for (let i = 72; i < 84; i++) {
    const centerId = i < 78 ? centers[0].id : centers[1].id;
    const semesterId = i < 78 ? semesters[0].id : semesters[1].id;
    enrollments.push(
      prisma.studentEnrollments.create({
        data: {
          studentId: students[i].id,
          centerId: centerId,
          semesterId: semesterId,
          projectId: projects[0].id,
          level: Level.PRIMARY_B,
          isActive: true,
        },
      }),
    );
  }

  await Promise.all(enrollments);

  console.log("✅ Database seeding completed successfully!");
  console.log(`📊 Created:
    • ${projects.length} project(s)
    • ${centers.length} center(s) 
    • ${semesters.length} semester(s)
    • ${users.length} user(s)
    • ${students.length} student(s)
    • Student enrollments and role assignments`);
}

async function main(): Promise<void> {
  assertDestructiveLocalSeedAllowed();
  const seedPassword = getDevelopmentSeedPassword();
  const prisma = new PrismaClient();

  try {
    await seedFixtures(prisma, seedPassword);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Error during seeding:", e);
  process.exit(1);
});
