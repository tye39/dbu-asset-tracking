import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const count = await prisma.user.count();
  console.log("Connected to Neon DB successfully! Total users:", count);
  const assetCount = await prisma.asset.count();
  console.log("Total assets:", assetCount);
}

main()
  .catch((e) => console.error("Connection error:", e.message))
  .finally(() => prisma.$disconnect());
