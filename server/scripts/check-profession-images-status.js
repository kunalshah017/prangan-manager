/**
 * Script to check the status of future profession image generation
 * Shows statistics and progress
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

const prisma = new PrismaClient();
const PROGRESS_FILE = path.join(__dirname, "future-profession-progress.json");

async function checkStatus() {
  console.log("\n📊 Future Profession Image Generation Status");
  console.log("=".repeat(60));

  try {
    // Get all students
    const allStudents = await prisma.students.findMany({
      select: {
        id: true,
        name: true,
        futureProfession: true,
        futureProfessionImageUrl: true,
      },
    });

    const totalStudents = allStudents.length;
    const withProfession = allStudents.filter(
      (s) => s.futureProfession && s.futureProfession.trim() !== ""
    );
    const withImage = allStudents.filter((s) => s.futureProfessionImageUrl);
    const withProfessionNoImage = withProfession.filter(
      (s) => !s.futureProfessionImageUrl
    );
    const noProfession = allStudents.filter(
      (s) => !s.futureProfession || s.futureProfession.trim() === ""
    );

    console.log("\n📈 Database Statistics:");
    console.log(`   Total Students: ${totalStudents}`);
    console.log(
      `   With Future Profession: ${withProfession.length} (${(
        (withProfession.length / totalStudents) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `   With Generated Image: ${withImage.length} (${(
        (withImage.length / totalStudents) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`   Pending Generation: ${withProfessionNoImage.length}`);
    console.log(`   No Profession Specified: ${noProfession.length}`);

    // Load progress file if exists
    if (fs.existsSync(PROGRESS_FILE)) {
      console.log("\n📁 Progress File:");
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
      console.log(`   Location: ${PROGRESS_FILE}`);
      console.log(
        `   Successfully Processed: ${
          progress.processedStudents.filter((p) => p.status === "success")
            .length
        }`
      );
      console.log(
        `   Skipped (No Profession): ${
          progress.processedStudents.filter((p) => p.status === "skipped")
            .length
        }`
      );
      console.log(`   Failed: ${progress.failedStudents.length}`);
      console.log(`   Last Run: ${progress.lastProcessedAt || "Never"}`);

      if (progress.failedStudents.length > 0) {
        console.log("\n   ⚠️  Failed Students:");
        progress.failedStudents.forEach((f) => {
          console.log(`      - ${f.name}: ${f.error}`);
        });
      }
    } else {
      console.log("\n📁 Progress File: Not found (no runs yet)");
    }

    // Completion status
    console.log("\n🎯 Completion Status:");
    if (withProfessionNoImage.length === 0) {
      console.log("   ✅ All students with professions have images!");
    } else {
      const percentage = (
        (withImage.length / withProfession.length) *
        100
      ).toFixed(1);
      console.log(
        `   🔄 ${percentage}% complete (${withImage.length}/${withProfession.length})`
      );
      console.log(`   📋 ${withProfessionNoImage.length} students remaining`);
    }

    // Sample of pending students
    if (withProfessionNoImage.length > 0) {
      console.log("\n📋 Sample Pending Students (first 10):");
      withProfessionNoImage.slice(0, 10).forEach((student, idx) => {
        console.log(
          `   ${idx + 1}. ${student.name} - ${student.futureProfession}`
        );
      });
      if (withProfessionNoImage.length > 10) {
        console.log(`   ... and ${withProfessionNoImage.length - 10} more`);
      }
    }

    // Sample of completed students
    if (withImage.length > 0) {
      console.log("\n✅ Sample Completed Students (first 5):");
      withImage.slice(0, 5).forEach((student, idx) => {
        console.log(
          `   ${idx + 1}. ${student.name} - ${student.futureProfession}`
        );
        console.log(`      🖼️  ${student.futureProfessionImageUrl}`);
      });
    }

    // Recommendations
    console.log("\n💡 Next Steps:");
    if (withProfessionNoImage.length === 0) {
      console.log("   🎉 All done! No action needed.");
    } else if (withImage.length === 0) {
      console.log(
        "   🧪 Run trial mode first: npm run generate-profession-images:trial"
      );
    } else {
      console.log(
        "   🚀 Continue with full mode: npm run generate-profession-images:full"
      );
    }

    if (fs.existsSync(PROGRESS_FILE)) {
      const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
      if (progress.failedStudents.length > 0) {
        console.log(
          "   🔄 Retry failed students: npm run generate-profession-images:resume"
        );
      }
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();
