import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function testLayout() {
  const paoUserId = "5b9cae54-ed44-469e-8667-6aa88c6a1308";
  
  console.log("Testing layout query 1: findUnique inventoryPerson");
  // @ts-ignore
  const isInventoryPerson = await prisma.inventoryPerson.findUnique({
    // @ts-ignore
    where: { userId: paoUserId, isActive: true }
  });
  console.log("isInventoryPerson:", isInventoryPerson);

  console.log("Testing layout query 2: pendingAssignments");
  const pendingAssignments = await prisma.assignment.findMany({
    where: {
      assignedToUserId: paoUserId,
      status: "PENDING_ACCEPTANCE",
    },
    include: {
      asset: {
        include: {
          category: true,
          assetType: true,
          department: true,
        },
      },
      assignedBy: { select: { name: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
  console.log("pendingAssignments count:", pendingAssignments.length);
}

testLayout()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
