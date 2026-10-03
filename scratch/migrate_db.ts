import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Applying database migration for IdentificationMethod...");

  await prisma.$executeRawUnsafe(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdentificationMethod') THEN 
        CREATE TYPE "IdentificationMethod" AS ENUM ('QR', 'BARCODE', 'NONE'); 
      END IF; 
    END $$;
  `);
  console.log("Enum IdentificationMethod ensured.");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "identificationMethod" "IdentificationMethod" NOT NULL DEFAULT 'NONE';
  `);
  console.log("Column identificationMethod on Asset ensured.");

  // Backfill: if an asset has an existing QRCode record, set to 'QR'
  const updated = await prisma.$executeRawUnsafe(`
    UPDATE "Asset" 
    SET "identificationMethod" = 'QR' 
    WHERE id IN (SELECT "assetId" FROM "QRCode") 
      AND "identificationMethod" = 'NONE';
  `);
  console.log(`Backfilled ${updated} existing assets with QRCode to QR method.`);

  const assets = await prisma.asset.findMany({
    select: { id: true, assetCode: true, identificationMethod: true }
  });
  console.log("Current assets identification methods:", assets);
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
