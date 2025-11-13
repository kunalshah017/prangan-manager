/**
 * Script to generate AI images for students' future professions
 * Uses Google Gemini AI and Cloudinary for storage
 *
 * Features:
 * - Rate limiting to stay within Gemini API limits
 * - Progress tracking with resume capability
 * - Trial mode for testing with first 2 students
 * - Error handling and logging
 *
 * Usage:
 * - Trial mode (first 2 students): node scripts/generate-future-profession-images.js --trial
 * - Full mode (all students): node scripts/generate-future-profession-images.js --full
 * - Resume from failure: node scripts/generate-future-profession-images.js --resume
 */

import { PrismaClient } from "../generated/prisma/index.js";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
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

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration
const CONFIG = {
  // Using OpenRouter with Gemini 2.5 Flash Image Preview (Nano Banana)
  // Pricing: $0.03 per output image (~1000 tokens) = ~$1.47 for 49 students
  // This model supports both text-to-image and image-to-image generation
  MODEL: "google/gemini-2.5-flash-image",
  RATE_LIMIT_DELAY_MS: 3000, // 3 seconds between requests
  PROGRESS_FILE: path.join(__dirname, "future-profession-progress.json"),
  TEMP_DIR: path.join(__dirname, "temp-images"),
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 10000, // Wait 10 seconds between retries
  IMAGE_ASPECT_RATIO: "1:1", // 1024x1024 square images
};

// Ensure temp directory exists
if (!fs.existsSync(CONFIG.TEMP_DIR)) {
  fs.mkdirSync(CONFIG.TEMP_DIR, { recursive: true });
}

/**
 * Load progress from file
 */
function loadProgress() {
  if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
    const data = fs.readFileSync(CONFIG.PROGRESS_FILE, "utf8");
    return JSON.parse(data);
  }
  return {
    processedStudents: [],
    failedStudents: [],
    lastProcessedAt: null,
  };
}

/**
 * Save progress to file
 */
function saveProgress(progress) {
  fs.writeFileSync(
    CONFIG.PROGRESS_FILE,
    JSON.stringify(progress, null, 2),
    "utf8"
  );
}

/**
 * Generate AI image using OpenRouter (Gemini 2.5 Flash Image)
 */
async function generateFutureProfessionImage(student, retryCount = 0) {
  try {
    console.log(
      `\n🎨 Generating image for ${student.name} - ${student.futureProfession}`
    );

    // Build the message content array
    const contentParts = [];

    // Detect profession type for specific uniform requirements
    const professionLower = student.futureProfession.toLowerCase();
    let uniformRequirement = "";

    if (professionLower.includes("police") || professionLower.includes("ips")) {
      uniformRequirement =
        "- MUST wear authentic Indian police khaki uniform with proper badges and insignia\n";
    } else if (professionLower.includes("army")) {
      uniformRequirement =
        "- MUST wear authentic Indian Army green camouflage uniform with proper ranks and insignia\n";
    } else if (professionLower.includes("navy")) {
      uniformRequirement =
        "- MUST wear authentic Indian Navy white uniform with proper ranks and insignia\n";
    }

    // Enhanced prompt for photorealistic generation - keeping current age
    const textPrompt = `Generate a highly detailed, photorealistic portrait of ${student.name} as a ${student.futureProfession}. 

CRITICAL REQUIREMENTS:
- PHOTOREALISTIC quality - should look like a professional photograph, not illustration
- Close-up portrait shot (head and upper body/shoulders) - show their face clearly
- KEEP THEIR CURRENT AGE - do NOT age them up, maintain their exact current appearance
- EXACTLY match their facial features, skin tone, face shape, eye color, and overall appearance from the reference image
- The face should be nearly identical to the reference photo - same person, same age
- Professional setting with relevant tools/equipment slightly blurred in background
- Sharp focus on their face with confident, proud expression
- Professional attire/costume appropriate for ${student.futureProfession}
${uniformRequirement}- Natural lighting (soft, professional portrait lighting)
- Shallow depth of field (subject sharp, background slightly blurred)
- Make students smiling if they are not smiling in their reference image, or give them suitable happy expression according to their profession & environment

Name: ${student.name}
Profession: ${student.futureProfession}
Style: Professional portrait photography, Canon EOS R5, 85mm f/1.8, natural light

IMPORTANT: Keep them at their current age shown in the reference image. Only change their clothing/setting to match the profession. The facial features, age, and identity must remain exactly the same!`;

    // If student has a profile image, include it for facial reference
    if (student.profileImageUrl) {
      console.log("  📸 Including student photo for exact facial reference...");
      contentParts.push({
        type: "text",
        text: `Reference photo of ${student.name}. CRITICAL: Keep them at EXACTLY this age and appearance. Match their facial features, skin tone, face shape, and likeness PRECISELY. Do NOT age them up. Only change their clothing and setting to match the ${student.futureProfession} profession.`,
      });
      contentParts.push({
        type: "image_url",
        image_url: {
          url: student.profileImageUrl,
        },
      });
    }

    // Add the main generation prompt
    contentParts.push({
      type: "text",
      text: textPrompt,
    });

    console.log("  🤖 Calling OpenRouter API...");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://prangan-manager.vercel.app",
          "X-Title": "Prangan Manager - Student Future Profession Images",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CONFIG.MODEL,
          messages: [
            {
              role: "user",
              content: contentParts,
            },
          ],
          modalities: ["image", "text"],
          image_config: {
            aspect_ratio: CONFIG.IMAGE_ASPECT_RATIO,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Extract image from response
    if (!result.choices || result.choices.length === 0) {
      throw new Error("No response from OpenRouter API");
    }

    const message = result.choices[0].message;

    // The image might be in different places depending on the SDK version
    let imageDataUrl = null;

    // Try different response formats
    if (message.images && message.images.length > 0) {
      imageDataUrl = message.images[0].image_url?.url || message.images[0].url;
    } else if (message.content && Array.isArray(message.content)) {
      // Sometimes the content is an array with text and image parts
      const imagePart = message.content.find(
        (part) => part.type === "image_url"
      );
      if (imagePart) {
        imageDataUrl = imagePart.image_url?.url || imagePart.url;
      }
    } else if (
      typeof message.content === "object" &&
      message.content.image_url
    ) {
      imageDataUrl = message.content.image_url.url;
    }

    if (!imageDataUrl) {
      console.log("  🔍 Full response:", JSON.stringify(result, null, 2));
      throw new Error(
        "No image in API response - model may not support image generation"
      );
    }

    // Extract base64 data (remove "data:image/png;base64," prefix)
    const base64Match = imageDataUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Invalid image data URL format");
    }

    const generatedImageData = base64Match[1];

    console.log("  ✅ Image generated successfully");
    return generatedImageData;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);

    if (retryCount < CONFIG.MAX_RETRIES) {
      console.log(
        `  ⚠️  Retrying (${retryCount + 1}/${CONFIG.MAX_RETRIES})...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.RETRY_DELAY_MS)
      );
      return generateFutureProfessionImage(student, retryCount + 1);
    }
    throw error;
  }
}

/**
 * Upload image to Cloudinary
 */
async function uploadToCloudinary(imageBase64, studentId, studentName) {
  try {
    console.log("  ☁️  Uploading to Cloudinary...");

    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${imageBase64}`,
      {
        folder: "student-future-professions",
        public_id: `student-${studentId}-future-profession`,
        overwrite: true,
        resource_type: "image",
        context: {
          alt: `${studentName} - Future Profession`,
          caption: `AI-generated image of ${studentName} in their future profession`,
        },
      }
    );

    console.log("  ✅ Uploaded to Cloudinary");
    return result.secure_url;
  } catch (error) {
    console.error("  ❌ Cloudinary upload failed:", error.message);
    throw error;
  }
}

/**
 * Update student record in database
 */
async function updateStudentImage(studentId, imageUrl) {
  try {
    await prisma.students.update({
      where: { id: studentId },
      data: { futureProfessionImageUrl: imageUrl },
    });
    console.log("  ✅ Database updated");
  } catch (error) {
    console.error("  ❌ Database update failed:", error.message);
    throw error;
  }
}

/**
 * Process a single student
 */
async function processStudent(student, progress) {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${student.name}`);
  console.log(`Profession: ${student.futureProfession || "Not specified"}`);
  console.log(`Profile Image: ${student.profileImageUrl ? "Yes" : "No"}`);
  console.log(`${"=".repeat(60)}`);

  try {
    // Check if student has a future profession
    if (!student.futureProfession || student.futureProfession.trim() === "") {
      console.log("  ⏭️  Skipping - No future profession specified");
      progress.processedStudents.push({
        studentId: student.id,
        name: student.name,
        profession: null,
        status: "skipped",
        reason: "No future profession",
        processedAt: new Date().toISOString(),
      });
      return;
    }

    // Generate AI image
    const imageData = await generateFutureProfessionImage(student);

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(
      imageData,
      student.id,
      student.name
    );

    // Update database
    await updateStudentImage(student.id, cloudinaryUrl);

    // Save progress
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    progress.processedStudents.push({
      studentId: student.id,
      name: student.name,
      profession: student.futureProfession,
      status: "success",
      imageUrl: cloudinaryUrl,
      processedAt: new Date().toISOString(),
      duration: `${duration}s`,
    });
    progress.lastProcessedAt = new Date().toISOString();
    saveProgress(progress);

    console.log(`\n✅ SUCCESS - Completed in ${duration}s`);
  } catch (error) {
    console.error(`\n❌ FAILED - ${error.message}`);
    progress.failedStudents.push({
      studentId: student.id,
      name: student.name,
      profession: student.futureProfession || null,
      error: error.message,
      failedAt: new Date().toISOString(),
    });
    saveProgress(progress);
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "--trial"; // Default to trial mode

  console.log("\n🚀 Future Profession Image Generator");
  console.log("=====================================\n");

  // Validate environment variables
  if (!process.env.OPENROUTER_API_KEY) {
    console.error(
      "❌ Error: OPENROUTER_API_KEY not found in environment variables"
    );
    console.log("💡 Get your API key at: https://openrouter.ai/keys");
    process.exit(1);
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    console.error(
      "❌ Error: Cloudinary credentials not found in environment variables"
    );
    process.exit(1);
  }

  console.log(`📋 Mode: ${mode}`);
  console.log(`🤖 Model: ${CONFIG.MODEL}`);
  console.log(`💰 Cost: ~$0.03 per image (~$0.15 per batch of 5)`);
  console.log(
    `⏱️  Rate limit: ${CONFIG.RATE_LIMIT_DELAY_MS}ms between requests`
  );
  console.log(`🔄 Max retries: ${CONFIG.MAX_RETRIES}\n`);

  // Load progress
  const progress = loadProgress();
  const processedIds = progress.processedStudents.map((p) => p.studentId);

  console.log(`📊 Progress loaded:`);
  console.log(`   - Processed: ${progress.processedStudents.length}`);
  console.log(`   - Failed: ${progress.failedStudents.length}`);
  console.log(`   - Last run: ${progress.lastProcessedAt || "Never"}\n`);

  // Fetch students
  let students = await prisma.students.findMany({
    select: {
      id: true,
      name: true,
      profileImageUrl: true,
      futureProfession: true,
      futureProfessionImageUrl: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  console.log(`📚 Total students in database: ${students.length}\n`);

  // Filter based on mode
  if (mode === "--trial") {
    console.log("🧪 TRIAL MODE: Processing first 2 students only\n");
    students = students.filter((s) => !processedIds.includes(s.id)).slice(0, 2);
  } else if (mode === "--full") {
    console.log("� FULL MODE: Processing next 5 unprocessed students\n");
    console.log("� Run the script again to continue with next batch\n");
    students = students.filter((s) => !processedIds.includes(s.id)).slice(0, 5);
  } else {
    console.error(`❌ Unknown mode: ${mode}`);
    console.log("\nUsage:");
    console.log("  --trial   : Process first 2 students (default)");
    console.log("  --full    : Process next 5 unprocessed students (batched)");
    process.exit(1);
  }

  if (students.length === 0) {
    console.log("✅ No students to process. All done!");
    process.exit(0);
  }

  console.log(`🎯 Students to process: ${students.length}\n`);
  console.log("Starting in 3 seconds...\n");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Process each student
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    console.log(`\n[${i + 1}/${students.length}]`);

    await processStudent(student, progress);

    // Rate limiting delay (except for last student)
    if (i < students.length - 1) {
      console.log(
        `\n⏳ Waiting ${CONFIG.RATE_LIMIT_DELAY_MS}ms before next request...`
      );
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY_MS)
      );
    }
  }

  // Final summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(60));
  console.log(
    `✅ Successfully processed: ${
      progress.processedStudents.filter((p) => p.status === "success").length
    }`
  );
  console.log(
    `⏭️  Skipped (no profession): ${
      progress.processedStudents.filter((p) => p.status === "skipped").length
    }`
  );
  console.log(`❌ Failed: ${progress.failedStudents.length}`);
  console.log(`\n📁 Progress file: ${CONFIG.PROGRESS_FILE}`);

  if (progress.failedStudents.length > 0) {
    console.log("\n⚠️  Failed students:");
    progress.failedStudents.forEach((f) => {
      console.log(`   - ${f.name}: ${f.error}`);
    });
    console.log("\n💡 Run with --resume to retry failed students");
  }

  console.log("\n✨ Done!\n");
}

// Run the script
main()
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
