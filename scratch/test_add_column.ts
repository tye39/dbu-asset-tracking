import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("1. Checking and updating AssetType schema...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "AssetType" 
    ADD COLUMN IF NOT EXISTS "includeAssetImage" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log("✓ Column includeAssetImage on AssetType ensured.");

  // Check columns on AssetType
  const cols: any = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'AssetType' AND column_name = 'includeAssetImage'"
  );
  console.log("AssetType includeAssetImage column:", cols);
}

main()
  .catch((err) => {
    console.error("Migration test error:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
