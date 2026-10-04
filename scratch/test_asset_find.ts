import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    await prisma.asset.findMany({ where: { deletedAt: null }, take: 1 });
    console.log("prisma.asset.findMany succeeded");
  } catch (e: any) {
    console.log("prisma.asset.findMany failed:\n", e.message, "\nCode:", e.code);
  }

  try {
    await prisma.assetType.findMany({ take: 1 });
    console.log("prisma.assetType.findMany succeeded");
  } catch (e: any) {
    console.log("prisma.assetType.findMany failed:\n", e.message, "\nCode:", e.code);
  }
}

test().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
