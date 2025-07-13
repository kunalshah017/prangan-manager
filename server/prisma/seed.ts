// import { PrismaClient } from "../generated/prisma/index.js";
// import bcryptjs from "bcryptjs";

// const prisma = new PrismaClient();

// async function main() {
//   const testPassword = "Prangan@2025";
//   const hashedPassword = await bcryptjs.hash(testPassword, 10);

//   console.log("🌱 Starting database seeding...\n");

//   // Create test admin user
//   const testAdmin = await prisma.user.upsert({
//     where: { email: "pranganfoundationindia@gmail.com" },
//     update: {},
//     create: {
//       email: "pranganfoundationindia@gmail.com",
//       name: "Prangan Admin",
//       password: hashedPassword,
//       role: "ADMIN",
//       status: "APPROVED",
//       phone: "+917718071289",
//       qualification: "Masters in Social Work",
//       address: "Prangan Foundation, Dombivli, Mumbai",
//       dob: new Date("1985-05-15"),
//       profileImageUrl:
//         "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
//     },
//   });

//   console.log("✅ Admin user created!");

//   // Create Chanchalmann Project
//   const chanchalmannProject = await prisma.projects.upsert({
//     where: { id: "chanchalmann-project" },
//     update: {},
//     create: {
//       id: "chanchalmann-project",
//       name: "Chanchalmann",
//       description:
//         "Educational empowerment program for underprivileged children in Mumbai region",
//       projectType: "Education",
//       status: "ACTIVE",
//       imageUrl:
//         "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400",
//       metadata: {
//         targetAge: "5-16 years",
//         focus: "Primary and Secondary Education",
//         location: "Mumbai Metropolitan Region",
//         established: "2020",
//       },
//     },
//   });

//   console.log("✅ Chanchalmann project created!");

//   // Create Centers
//   const tulipCenter = await prisma.centers.upsert({
//     where: { id: "tulip-center" },
//     update: {},
//     create: {
//       id: "tulip-center",
//       name: "Tulip Center",
//       address:
//         "Plot No. 45, Tulip Society, Near Dombivli Railway Station, Dombivli East, Mumbai - 421201",
//       projectId: chanchalmannProject.id,
//       metadata: {
//         capacity: 50,
//         facilities: ["Library", "Computer Lab", "Play Area"],
//         timings: "9:00 AM - 5:00 PM",
//         coordinator: "Priya Sharma",
//       },
//     },
//   });

//   const lavenderCenter = await prisma.centers.upsert({
//     where: { id: "lavender-center" },
//     update: {},
//     create: {
//       id: "lavender-center",
//       name: "Lavender Center",
//       address:
//         "Building No. 12, Lavender Gardens, Kalyan West, Near Birla College, Mumbai - 421301",
//       projectId: chanchalmannProject.id,
//       metadata: {
//         capacity: 40,
//         facilities: ["Art Room", "Music Room", "Study Hall"],
//         timings: "8:30 AM - 4:30 PM",
//         coordinator: "Amit Patel",
//       },
//     },
//   });

//   console.log("✅ Centers created!");

//   // Create Semesters
//   const semester2025 = await prisma.semesters.upsert({
//     where: { id: "sem-2025-2026-tulip" },
//     update: {},
//     create: {
//       id: "sem-2025-2026-tulip",
//       name: "Academic Year 2025-2026",
//       startDate: new Date("2025-06-01"),
//       endDate: new Date("2026-05-31"),
//       centerId: tulipCenter.id,
//     },
//   });

//   const semester2025Lavender = await prisma.semesters.upsert({
//     where: { id: "sem-2025-2026-lavender" },
//     update: {},
//     create: {
//       id: "sem-2025-2026-lavender",
//       name: "Academic Year 2025-2026",
//       startDate: new Date("2025-06-01"),
//       endDate: new Date("2026-05-31"),
//       centerId: lavenderCenter.id,
//     },
//   });

//   console.log("✅ Semesters created!");

//   // Create Students with Indian names
//   const studentsData = [
//     {
//       name: "Aarav Mehta",
//       dob: new Date("2015-03-12"),
//       phoneNumber: "+919876541001",
//       whatsappNumber: "+919876541001",
//       alternateNumber: "+912267891001",
//       level: "LEVEL_2",
//       profileImageUrl:
//         "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
//     },
//     {
//       name: "Diya Sharma",
//       dob: new Date("2016-07-25"),
//       phoneNumber: "+919876541002",
//       whatsappNumber: "+919876541002",
//       alternateNumber: "+912267891002",
//       level: "LEVEL_1",
//       profileImageUrl:
//         "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=150",
//     },
//     {
//       name: "Arjun Singh",
//       dob: new Date("2014-11-08"),
//       phoneNumber: "+919876541003",
//       whatsappNumber: "+919876541003",
//       alternateNumber: "+912267891003",
//       level: "LEVEL_3",
//     },
//     {
//       name: "Ananya Patel",
//       dob: new Date("2017-01-15"),
//       phoneNumber: "+919876541004",
//       whatsappNumber: "+919876541004",
//       alternateNumber: "+912267891004",
//       level: "PRIMARY_A",
//       profileImageUrl:
//         "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150",
//     },
//     {
//       name: "Vihaan Kumar",
//       dob: new Date("2016-09-30"),
//       phoneNumber: "+919876541005",
//       whatsappNumber: "+919876541005",
//       alternateNumber: "+912267891005",
//       level: "LEVEL_1",
//     },
//     {
//       name: "Saanvi Gupta",
//       dob: new Date("2015-12-03"),
//       phoneNumber: "+919876541006",
//       whatsappNumber: "+919876541006",
//       alternateNumber: "+912267891006",
//       level: "LEVEL_2",
//       profileImageUrl:
//         "https://images.unsplash.com/photo-1548142813-c348350df52b?w=150",
//     },
//     {
//       name: "Reyansh Joshi",
//       dob: new Date("2014-05-20"),
//       phoneNumber: "+919876541007",
//       whatsappNumber: "+919876541007",
//       alternateNumber: "+912267891007",
//       level: "LEVEL_4",
//     },
//     {
//       name: "Isha Agarwal",
//       dob: new Date("2017-08-14"),
//       phoneNumber: "+919876541008",
//       whatsappNumber: "+919876541008",
//       alternateNumber: "+912267891008",
//       level: "PRIMARY_B",
//       profileImageUrl:
//         "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
//     },
//     {
//       name: "Atharv Shah",
//       dob: new Date("2015-10-22"),
//       phoneNumber: "+919876541009",
//       whatsappNumber: "+919876541009",
//       alternateNumber: "+912267891009",
//       level: "LEVEL_2",
//     },
//     {
//       name: "Kavya Reddy",
//       dob: new Date("2016-04-18"),
//       phoneNumber: "+919876541010",
//       whatsappNumber: "+919876541010",
//       alternateNumber: "+912267891010",
//       level: "LEVEL_1",
//       profileImageUrl:
//         "https://images.unsplash.com/photo-1546967191-fdfb13ed6b1e?w=150",
//     },
//   ];

//   for (const studentData of studentsData) {
//     await prisma.students.create({
//       data: studentData,
//     });
//   }

//   console.log("✅ Students created!");

//   // Final summary
//   console.log("\n🎉 Database seeding completed successfully!");
//   console.log("\n📊 Summary:");
//   console.log("👥 Users: 3 (1 Admin + 2 Staff)");
//   console.log("📁 Projects: 1 (Chanchalmann)");
//   console.log("🏢 Centers: 2 (Tulip + Lavender)");
//   console.log("📅 Semesters: 2 (2025-2026 for both centers)");
//   console.log("🎓 Students: 10 (Various levels)");

//   console.log("\n🔐 Login Credentials:");
//   console.log("📧 Admin Email: pranganfoundationindia@gmail.com");
//   console.log("🔑 Password: Prangan@2025");
//   console.log("👤 Role: ADMIN");
//   console.log("🆔 User ID:", testAdmin.id);

//   console.log("\n📍 Centers Location: Dombivli & Kalyan, Mumbai");
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error("❌ Error during seeding:", e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
