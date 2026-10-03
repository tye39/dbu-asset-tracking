import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const assets = await prisma.asset.findMany({
    where: { deletedAt: null },
    select: { id: true, publicId: true, assetCode: true, name: true, status: true },
    take: 5
  });
  console.log("Sample Assets:", assets);
}

main().finally(() => prisma.$disconnect());
