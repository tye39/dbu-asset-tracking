import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const users = await prisma.user.findMany({
    include: { role: true, department: true }
  });
  console.log("Users:", users.map(u => ({ id: u.id, email: u.email, role: u.role.name, dept: u.department?.name })));
}

check().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
