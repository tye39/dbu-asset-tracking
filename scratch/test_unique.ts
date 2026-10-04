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
    // @ts-ignore
    await prisma.inventoryPerson.findUnique({
      // @ts-ignore
      where: { userId: "00000000-0000-0000-0000-000000000000", isActive: true }
    });
    console.log("findUnique with isActive worked!");
  } catch (e: any) {
    console.error("findUnique ERROR:\n", e);
  }
}

test().finally(() => pool.end());
