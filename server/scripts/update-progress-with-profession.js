/**
 * Script to update existing progress file with student professions
 * Adds the futureProfession field to all processed students
 */

import { PrismaClient } from "../generated/prisma/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Prisma
const prisma = new PrismaClient();

const PROGRESS_FILE = path.join(__dirname, "future-profession-progress.json");

async function updateProgressWithProfessions() {
  console.log("🔄 Updating progress file with professions...\n");

  // Read current progress file
  if (!fs.existsSync(PROGRESS_FILE)) {
    console.error("❌ Progress file not found!");
    process.exit(1);
  }

  const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));

  console.log(
    `📊 Found ${progress.processedStudents.length} processed students`
  );

  // Fetch all students from database
  const students = await prisma.students.findMany({
    select: {
      id: true,
      name: true,
      futureProfession: true,
    },
  });

  // Create a map of studentId -> profession
  const professionMap = new Map();
  students.forEach((student) => {
    professionMap.set(student.id, student.futureProfession);
  });

  // Update each processed student with their profession
  let updatedCount = 0;
  progress.processedStudents.forEach((student) => {
    const profession = professionMap.get(student.studentId);
    if (profession && !student.profession) {
      student.profession = profession;
      updatedCount++;
      console.log(`✅ Updated ${student.name}: ${profession}`);
    } else if (student.profession) {
      console.log(`⏭️  Skipped ${student.name}: Already has profession`);
    } else {
      console.log(`⚠️  ${student.name}: No profession found in database`);
    }
  });

  // Save updated progress
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf8");

  console.log(`\n✨ Done! Updated ${updatedCount} student records`);
  console.log(`📁 Progress file: ${PROGRESS_FILE}`);
}

// Run the script
updateProgressWithProfessions()
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
