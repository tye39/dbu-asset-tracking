import "dotenv/config";
import { Pool } from "pg";

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log("Starting safe migration for Asset.publicId...");
    await client.query("BEGIN");

    // 1. Add column if not exists
    await client.query(`
      ALTER TABLE "Asset" 
      ADD COLUMN IF NOT EXISTS "publicId" TEXT;
    `);
    console.log("Checked/created publicId column on Asset table.");

    // 2. Backfill existing assets that lack a publicId
    const updateRes = await client.query(`
      UPDATE "Asset" 
      SET "publicId" = gen_random_uuid()::text 
      WHERE "publicId" IS NULL;
    `);
    console.log(`Backfilled publicId for ${updateRes.rowCount} existing asset(s).`);

    // 3. Set NOT NULL constraint
    await client.query(`
      ALTER TABLE "Asset" 
      ALTER COLUMN "publicId" SET NOT NULL;
    `);
    console.log("Applied NOT NULL constraint to Asset.publicId.");

    // 4. Create unique index if not exists
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Asset_publicId_key" 
      ON "Asset"("publicId");
    `);
    console.log("Applied unique index Asset_publicId_key.");

    // 5. Update existing QRCode records so their qrCodeString points to public verification URL
    const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
    const qrUpdateRes = await client.query(`
      UPDATE "QRCode" q
      SET "qrCodeString" = $1 || '/asset/verify/' || a."publicId"
      FROM "Asset" a
      WHERE q."assetId" = a."id"
        AND (q."qrCodeString" LIKE '%/assets/%' OR q."qrCodeString" = a."assetCode");
    `, [baseUrl]);
    console.log(`Updated ${qrUpdateRes.rowCount} QRCode record(s) to point to public verification URL.`);

    await client.query("COMMIT");
    console.log("Safe migration completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed, transaction rolled back:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error("Migration script error:", err);
  process.exit(1);
});
