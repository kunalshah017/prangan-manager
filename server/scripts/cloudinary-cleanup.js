import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "../generated/prisma/index.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma and Cloudinary
const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create backup directory structure
function createBackupDirectories() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(
    __dirname,
    "..",
    "backups",
    `cloudinary-cleanup-${timestamp}`
  );
  const imagesDir = path.join(backupDir, "images");
  const metadataDir = path.join(backupDir, "metadata");

  [backupDir, imagesDir, metadataDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return { backupDir, imagesDir, metadataDir };
}

// Extract Cloudinary public_id from full image URL
function extractPublicId(url) {
  if (!url) return null;
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    const afterUpload = url.slice(uploadIndex + 8); // skip "/upload/"
    const withoutVersion = afterUpload.replace(/^v\d+\//, ""); // remove "v123456789/"
    const publicId = withoutVersion.replace(/\.[^/.]+$/, ""); // remove extension
    return publicId;
  } catch {
    return null;
  }
}

// Download image from URL to local file
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });

        file.on("error", (err) => {
          fs.unlink(filePath, () => {}); // Delete incomplete file
          reject(err);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

// Get file extension from URL
function getFileExtension(url) {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1] : "jpg"; // Default to jpg if no extension found
}

async function getAllImagePublicIdsFromDB() {
  const [projectImages, userImages, studentImages] = await Promise.all([
    prisma.projects.findMany({ select: { imageUrl: true } }),
    prisma.user.findMany({ select: { profileImageUrl: true } }),
    prisma.students.findMany({
      select: {
        profileImageUrl: true,
        futureProfessionImageUrl: true,
      },
    }),
  ]);

  const urls = [
    ...projectImages.map((p) => p.imageUrl),
    ...userImages.map((u) => u.profileImageUrl),
    ...studentImages.map((s) => s.profileImageUrl),
    ...studentImages.map((s) => s.futureProfessionImageUrl),
  ].filter(Boolean);

  const publicIds = new Set();
  for (const url of urls) {
    const publicId = extractPublicId(url);
    if (publicId) publicIds.add(publicId);
  }

  return publicIds;
}

// Returns a Map<public_id, resource_metadata>
async function getAllCloudinaryAssets() {
  let nextCursor = null;
  const assetMap = new Map();

  do {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "",
      max_results: 500,
      next_cursor: nextCursor,
      resource_type: "image",
    });

    for (const resource of result.resources) {
      assetMap.set(resource.public_id, {
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        url: resource.url,
        format: resource.format,
        width: resource.width,
        height: resource.height,
        bytes: resource.bytes,
        created_at: resource.created_at,
        uploaded_at: resource.uploaded_at,
        type: resource.type,
        resource_type: resource.resource_type,
        folder: resource.folder || "",
        version: resource.version,
        etag: resource.etag,
        tags: resource.tags || [],
      });
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  return assetMap;
}

// Save metadata to JSON file
function saveMetadata(metadata, filePath) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(metadata, null, 2), "utf8", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function dryRunUnusedImages() {
  const [usedPublicIds, cloudinaryAssets] = await Promise.all([
    getAllImagePublicIdsFromDB(),
    getAllCloudinaryAssets(),
  ]);

  const unused = [];

  for (const [publicId, metadata] of cloudinaryAssets.entries()) {
    if (!usedPublicIds.has(publicId)) {
      unused.push(metadata);
    }
  }

  console.log(`🔍 Dry Run: Found ${unused.length} unused image(s).`);

  if (unused.length === 0) {
    console.log("🎉 No unused images found. Everything is in use.");
  } else {
    console.log("\nThese images appear unused and can be safely deleted:\n");

    unused.forEach((metadata) => {
      console.log(`🖼️ ${metadata.public_id}`);
      console.log(`🔗 ${metadata.secure_url}`);
      console.log(
        `📏 ${metadata.width}x${metadata.height} (${metadata.format})`
      );
      console.log(`� ${(metadata.bytes / 1024).toFixed(2)} KB`);
      console.log(`� Created: ${metadata.created_at}\n`);
    });
  }
}

async function backupUnusedImages() {
  console.log("🔍 Finding unused images...");

  const [usedPublicIds, cloudinaryAssets] = await Promise.all([
    getAllImagePublicIdsFromDB(),
    getAllCloudinaryAssets(),
  ]);

  const unused = [];
  for (const [publicId, metadata] of cloudinaryAssets.entries()) {
    if (!usedPublicIds.has(publicId)) {
      unused.push(metadata);
    }
  }

  if (unused.length === 0) {
    console.log("🎉 No unused images found. Nothing to backup.");
    return { backupDir: null, backedUpCount: 0 };
  }

  console.log(`📦 Creating backup for ${unused.length} unused image(s)...`);

  const { backupDir, imagesDir, metadataDir } = createBackupDirectories();

  console.log(`📁 Backup directory: ${backupDir}`);

  const backupSummary = {
    timestamp: new Date().toISOString(),
    totalImages: unused.length,
    images: [],
    failed: [],
  };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < unused.length; i++) {
    const metadata = unused[i];
    const progress = `[${i + 1}/${unused.length}]`;

    try {
      console.log(`${progress} Backing up: ${metadata.public_id}`);

      // Generate safe filename
      const safePublicId = metadata.public_id.replace(/[\/\\:*?"<>|]/g, "_");
      const extension =
        metadata.format || getFileExtension(metadata.secure_url);
      const imageFileName = `${safePublicId}.${extension}`;
      const metadataFileName = `${safePublicId}.json`;

      const imagePath = path.join(imagesDir, imageFileName);
      const metadataPath = path.join(metadataDir, metadataFileName);

      // Download image and save metadata in parallel
      await Promise.all([
        downloadImage(metadata.secure_url, imagePath),
        saveMetadata(metadata, metadataPath),
      ]);

      backupSummary.images.push({
        public_id: metadata.public_id,
        filename: imageFileName,
        metadataFile: metadataFileName,
        size: metadata.bytes,
        url: metadata.secure_url,
      });

      successCount++;
      console.log(
        `✅ ${progress} Successfully backed up: ${metadata.public_id}`
      );
    } catch (error) {
      failCount++;
      const errorInfo = {
        public_id: metadata.public_id,
        error: error.message,
        url: metadata.secure_url,
      };

      backupSummary.failed.push(errorInfo);
      console.error(
        `❌ ${progress} Failed to backup ${metadata.public_id}: ${error.message}`
      );
    }
  }

  // Save backup summary
  const summaryPath = path.join(backupDir, "backup-summary.json");
  await saveMetadata(backupSummary, summaryPath);

  console.log(`\n📊 Backup Summary:`);
  console.log(`✅ Successfully backed up: ${successCount} images`);
  console.log(`❌ Failed to backup: ${failCount} images`);
  console.log(`📁 Backup location: ${backupDir}`);

  if (failCount > 0) {
    console.log(
      `\n⚠️  Some images failed to backup. Check ${summaryPath} for details.`
    );
  }

  return { backupDir, backedUpCount: successCount };
}

async function deleteUnusedImages(backupSummary) {
  if (
    !backupSummary ||
    !backupSummary.images ||
    backupSummary.images.length === 0
  ) {
    console.log("❌ No images to delete or backup summary is invalid.");
    return { deletedCount: 0, failedCount: 0 };
  }

  console.log(
    `🗑️  Starting deletion of ${backupSummary.images.length} backed-up images...`
  );

  let deletedCount = 0;
  let failedCount = 0;
  const deletionResults = [];

  for (let i = 0; i < backupSummary.images.length; i++) {
    const imageInfo = backupSummary.images[i];
    const progress = `[${i + 1}/${backupSummary.images.length}]`;

    try {
      console.log(`${progress} Deleting: ${imageInfo.public_id}`);

      const result = await cloudinary.uploader.destroy(imageInfo.public_id);

      if (result.result === "ok") {
        deletedCount++;
        console.log(
          `✅ ${progress} Successfully deleted: ${imageInfo.public_id}`
        );
        deletionResults.push({
          public_id: imageInfo.public_id,
          status: "deleted",
          result: result,
        });
      } else {
        failedCount++;
        console.error(
          `⚠️  ${progress} Failed to delete ${imageInfo.public_id}: ${result.result}`
        );
        deletionResults.push({
          public_id: imageInfo.public_id,
          status: "failed",
          error: result.result,
          result: result,
        });
      }
    } catch (error) {
      failedCount++;
      console.error(
        `❌ ${progress} Error deleting ${imageInfo.public_id}: ${error.message}`
      );
      deletionResults.push({
        public_id: imageInfo.public_id,
        status: "error",
        error: error.message,
      });
    }
  }

  console.log(`\n🗑️  Deletion Summary:`);
  console.log(`✅ Successfully deleted: ${deletedCount} images`);
  console.log(`❌ Failed to delete: ${failedCount} images`);

  return { deletedCount, failedCount, results: deletionResults };
}

async function backupAndDeleteUnusedImages() {
  console.log("🚀 Starting backup and cleanup process...\n");

  try {
    // Step 1: Backup unused images
    const backupResult = await backupUnusedImages();

    if (backupResult.backedUpCount === 0) {
      console.log("✨ No cleanup needed!");
      return;
    }

    // Load backup summary for deletion
    const summaryPath = path.join(
      backupResult.backupDir,
      "backup-summary.json"
    );
    const backupSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

    console.log(
      `\n⏳ Proceeding with deletion of ${backupResult.backedUpCount} successfully backed-up images...\n`
    );

    // Step 2: Delete backed-up images
    const deleteResult = await deleteUnusedImages(backupSummary);

    // Step 3: Update backup summary with deletion results
    const finalSummary = {
      ...backupSummary,
      deletionSummary: {
        timestamp: new Date().toISOString(),
        deletedCount: deleteResult.deletedCount,
        failedCount: deleteResult.failedCount,
        results: deleteResult.results,
      },
    };

    await saveMetadata(finalSummary, summaryPath);

    console.log(`\n🎉 Cleanup completed!`);
    console.log(`📁 Full backup and deletion log: ${summaryPath}`);
    console.log(
      `💾 Images backed up to: ${path.join(backupResult.backupDir, "images")}`
    );
    console.log(
      `📋 Metadata saved to: ${path.join(backupResult.backupDir, "metadata")}`
    );
  } catch (error) {
    console.error("💥 Error during backup and cleanup process:", error);
    throw error;
  }
}

async function restoreFromBackup(backupDirectory) {
  const summaryPath = path.join(backupDirectory, "backup-summary.json");
  const imagesDir = path.join(backupDirectory, "images");

  if (!fs.existsSync(summaryPath)) {
    throw new Error(`Backup summary not found: ${summaryPath}`);
  }

  if (!fs.existsSync(imagesDir)) {
    throw new Error(`Images directory not found: ${imagesDir}`);
  }

  const backupSummary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

  console.log(`🔄 Starting restoration from backup: ${backupDirectory}`);
  console.log(`📅 Backup created: ${backupSummary.timestamp}`);
  console.log(`📊 Total images to restore: ${backupSummary.images.length}`);

  let restoredCount = 0;
  let failedCount = 0;
  const restorationResults = [];

  for (let i = 0; i < backupSummary.images.length; i++) {
    const imageInfo = backupSummary.images[i];
    const progress = `[${i + 1}/${backupSummary.images.length}]`;
    const imagePath = path.join(imagesDir, imageInfo.filename);

    try {
      console.log(`${progress} Restoring: ${imageInfo.public_id}`);

      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Upload image back to Cloudinary with original public_id
      const result = await cloudinary.uploader.upload(imagePath, {
        public_id: imageInfo.public_id,
        overwrite: true,
        resource_type: "image",
      });

      if (result.public_id === imageInfo.public_id) {
        restoredCount++;
        console.log(
          `✅ ${progress} Successfully restored: ${imageInfo.public_id}`
        );
        restorationResults.push({
          public_id: imageInfo.public_id,
          status: "restored",
          new_url: result.secure_url,
          result: result,
        });
      } else {
        throw new Error(
          `Public ID mismatch: expected ${imageInfo.public_id}, got ${result.public_id}`
        );
      }
    } catch (error) {
      failedCount++;
      console.error(
        `❌ ${progress} Failed to restore ${imageInfo.public_id}: ${error.message}`
      );
      restorationResults.push({
        public_id: imageInfo.public_id,
        status: "failed",
        error: error.message,
      });
    }
  }

  // Save restoration summary
  const restorationSummary = {
    restorationTimestamp: new Date().toISOString(),
    backupDirectory: backupDirectory,
    originalBackupTimestamp: backupSummary.timestamp,
    totalImages: backupSummary.images.length,
    restoredCount: restoredCount,
    failedCount: failedCount,
    results: restorationResults,
  };

  const restorationPath = path.join(
    backupDirectory,
    "restoration-summary.json"
  );
  await saveMetadata(restorationSummary, restorationPath);

  console.log(`\n🔄 Restoration Summary:`);
  console.log(`✅ Successfully restored: ${restoredCount} images`);
  console.log(`❌ Failed to restore: ${failedCount} images`);
  console.log(`📋 Restoration log: ${restorationPath}`);

  return restorationSummary;
}

// Main execution logic
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "dry-run";

  console.log("🧹 Cloudinary Cleanup Tool\n");

  try {
    switch (mode) {
      case "dry-run":
        console.log("📋 Running in DRY-RUN mode (no changes will be made)\n");
        await dryRunUnusedImages();
        break;

      case "backup-only":
        console.log("💾 Running in BACKUP-ONLY mode\n");
        await backupUnusedImages();
        break;

      case "backup-and-delete":
        console.log("🗑️  Running in BACKUP-AND-DELETE mode\n");
        await backupAndDeleteUnusedImages();
        break;

      case "restore":
        const backupDir = args[1];
        if (!backupDir) {
          console.error(
            "❌ Please provide backup directory path for restore mode"
          );
          console.log(
            "Usage: node cloudinary-cleanup.js restore <backup-directory-path>"
          );
          process.exit(1);
        }
        console.log(`🔄 Running in RESTORE mode from: ${backupDir}\n`);
        await restoreFromBackup(backupDir);
        break;

      default:
        console.log("❓ Available modes:");
        console.log(
          "  dry-run           - Show unused images without making changes (default)"
        );
        console.log(
          "  backup-only       - Download and backup unused images without deleting"
        );
        console.log(
          "  backup-and-delete - Backup unused images and then delete from Cloudinary"
        );
        console.log(
          "  restore <path>    - Restore images from a backup directory"
        );
        console.log("\nExamples:");
        console.log("  node cloudinary-cleanup.js");
        console.log("  node cloudinary-cleanup.js dry-run");
        console.log("  node cloudinary-cleanup.js backup-only");
        console.log("  node cloudinary-cleanup.js backup-and-delete");
        console.log(
          "  node cloudinary-cleanup.js restore ./backups/cloudinary-cleanup-2024-01-01T12-00-00-000Z"
        );
        break;
    }
  } catch (error) {
    console.error("💥 Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
