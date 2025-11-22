/**
 * Check how many students need image generation
 */
import { PrismaClient } from "../generated/prisma/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function checkEligible() {
  // Load progress file
  const progressFile = path.join(__dirname, "future-profession-progress.json");
  let processedIds = [];
  
  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile, "utf8"));
    processedIds = progress.processedStudents.map(p => p.studentId);
  }

  // Fetch all students with future profession
  const allStudents = await prisma.students.findMany({
    select: {
      id: true,
      name: true,
      futureProfession: true,
      futureProfessionImageUrl: true,
    },
    where: {
      futureProfession: {
        not: null,
      },
    },
    orderBy: { name: "asc" },
  });

  console.log("\n📊 Current Status:");
  console.log("=".repeat(60));
  console.log(`Total students with future profession: ${allStudents.length}`);
  console.log(`Previously processed (in progress file): ${processedIds.length}`);

  // Find students who need processing
  const needsProcessing = allStudents.filter(s => !processedIds.includes(s.id));
  
  console.log(`\n🎯 Students needing image generation: ${needsProcessing.length}`);
  
  if (needsProcessing.length > 0) {
    console.log(`\n📋 Next 5 to be processed (in --full mode):`);
    needsProcessing.slice(0, 5).forEach((s, i) => {
      console.log(`   ${i+1}. ${s.name} - ${s.futureProfession}`);
    });
    
    if (needsProcessing.length > 5) {
      console.log(`\n   ... and ${needsProcessing.length - 5} more students`);
    }
  }

  // Check for updated professions (students in progress but profession changed)
  console.log(`\n🔍 Checking for updated professions...`);
  const progress = JSON.parse(fs.readFileSync(progressFile, "utf8"));
  const updatedProfessions = [];
  
  for (const processed of progress.processedStudents) {
    const current = allStudents.find(s => s.id === processed.studentId);
    if (current && current.futureProfession && current.futureProfession.trim() !== (processed.profession || "").trim()) {
      updatedProfessions.push({
        name: current.name,
        old: processed.profession || "null",
        new: current.futureProfession
      });
    }
  }

  if (updatedProfessions.length > 0) {
    console.log(`\n⚠️  WARNING: ${updatedProfessions.length} students have updated professions:`);
    updatedProfessions.forEach(u => {
      console.log(`   - ${u.name}: '${u.old}' → '${u.new}'`);
    });
    console.log(`\n💡 These are already in progress file and WON'T be regenerated.`);
    console.log(`   Current script only processes NEW students (not in progress file).`);
    console.log(`   To regenerate updated professions, manually remove them from progress file.`);
  } else {
    console.log(`✅ No profession updates detected.`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n💰 Cost estimate:");
  console.log(`   - Next batch (5 students): ~$0.15`);
  console.log(`   - All remaining (${needsProcessing.length} students): ~$${(needsProcessing.length * 0.03).toFixed(2)}`);

  await prisma.$disconnect();
}

checkEligible().catch(console.error);
