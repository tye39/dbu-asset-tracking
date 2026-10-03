import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: { select: { name: true } }, mustChangePassword: true }
  });
  console.log("Users in DB:", users);
}

main().finally(() => prisma.$disconnect());
