import { cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverRoot = join(__dirname, "..");

const sourceDir = join(serverRoot, "generated");
const destDir = join(serverRoot, "dist", "generated");

if (existsSync(sourceDir)) {
  console.log("Copying Prisma generated files to dist...");
  cpSync(sourceDir, destDir, { recursive: true });
  console.log("✓ Prisma files copied successfully");
} else {
  console.warn(
    'Warning: generated/prisma directory not found. Run "prisma generate" first.'
  );
  process.exit(1);
}
