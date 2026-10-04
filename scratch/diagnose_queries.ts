import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  AssetStatus,
  TransferStatus,
  MaintenanceStatus,
  AssetRequestStatus,
  PropertyAppealStatus,
} from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.production
dotenv.config({ path: path.resolve(process.cwd(), ".env.production") });

const connectionString = process.env.DATABASE_URL;
console.log("Connecting to:", connectionString?.split("@")[1]); // print host without password

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("\n--- Testing queries from src/app/(dashboard)/pao/dashboard/page.tsx ---");

  // Query 1: totalAssets
  try {
    const totalAssets = await prisma.asset.count({ where: { deletedAt: null } });
    console.log("✓ Q1 prisma.asset.count (totalAssets):", totalAssets);
  } catch (err: any) {
    console.error("✗ Q1 prisma.asset.count (totalAssets) FAILED:", err.message);
  }

  // Query 2: availableAssets
  try {
    const availableAssets = await prisma.asset.count({ where: { status: AssetStatus.ACTIVE, deletedAt: null } });
    console.log("✓ Q2 prisma.asset.count (availableAssets):", availableAssets);
  } catch (err: any) {
    console.error("✗ Q2 prisma.asset.count (availableAssets) FAILED:", err.message);
  }

  // Query 3: assignedAssets
  try {
    const assignedAssets = await prisma.asset.count({ where: { status: AssetStatus.ASSIGNED, deletedAt: null } });
    console.log("✓ Q3 prisma.asset.count (assignedAssets):", assignedAssets);
  } catch (err: any) {
    console.error("✗ Q3 prisma.asset.count (assignedAssets) FAILED:", err.message);
  }

  // Query 4: underMaintenance
  try {
    const underMaintenance = await prisma.asset.count({ where: { status: AssetStatus.UNDER_MAINTENANCE, deletedAt: null } });
    console.log("✓ Q4 prisma.asset.count (underMaintenance):", underMaintenance);
  } catch (err: any) {
    console.error("✗ Q4 prisma.asset.count (underMaintenance) FAILED:", err.message);
  }

  // Query 5: pendingTransfers
  try {
    const pendingTransfers = await prisma.transfer.count({ where: { status: TransferStatus.PENDING } });
    console.log("✓ Q5 prisma.transfer.count (pendingTransfers):", pendingTransfers);
  } catch (err: any) {
    console.error("✗ Q5 prisma.transfer.count (pendingTransfers) FAILED:", err.message);
  }

  // Query 6: disposedAssets
  try {
    const disposedAssets = await prisma.asset.count({ where: { status: AssetStatus.DISPOSED, deletedAt: null } });
    console.log("✓ Q6 prisma.asset.count (disposedAssets):", disposedAssets);
  } catch (err: any) {
    console.error("✗ Q6 prisma.asset.count (disposedAssets) FAILED:", err.message);
  }

  // Query 7: pendingMaintenances
  try {
    const pendingMaintenances = await prisma.maintenance.count({ where: { status: MaintenanceStatus.PENDING } });
    console.log("✓ Q7 prisma.maintenance.count (pendingMaintenances):", pendingMaintenances);
  } catch (err: any) {
    console.error("✗ Q7 prisma.maintenance.count (pendingMaintenances) FAILED:", err.message);
  }

  // Query 8: totalCategories
  try {
    const totalCategories = await prisma.assetCategory.count({ where: { deletedAt: null } });
    console.log("✓ Q8 prisma.assetCategory.count (totalCategories):", totalCategories);
  } catch (err: any) {
    console.error("✗ Q8 prisma.assetCategory.count (totalCategories) FAILED:", err.message);
  }

  // Query 9: pendingAssetRequests
  try {
    const pendingAssetRequests = await prisma.assetRequest.count({
      where: { status: AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD },
    });
    console.log("✓ Q9 prisma.assetRequest.count (pendingAssetRequests):", pendingAssetRequests);
  } catch (err: any) {
    console.error("✗ Q9 prisma.assetRequest.count (pendingAssetRequests) FAILED:\n", err);
  }

  // Query 10: pendingAppeals
  try {
    const pendingAppeals = await prisma.propertyAppeal.count({
      where: {
        status: {
          in: [
            PropertyAppealStatus.PENDING_PROPERTY_MANAGEMENT,
            PropertyAppealStatus.UNDER_REVIEW,
            PropertyAppealStatus.ADDITIONAL_INFORMATION_REQUIRED,
          ],
        },
      },
    });
    console.log("✓ Q10 prisma.propertyAppeal.count (pendingAppeals):", pendingAppeals);
  } catch (err: any) {
    console.error("✗ Q10 prisma.propertyAppeal.count (pendingAppeals) FAILED:\n", err);
  }

  // Query 11: categories findMany
  try {
    const categories = await prisma.assetCategory.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: { assets: { where: { deletedAt: null } } }
        }
      }
    });
    console.log("✓ Q11 prisma.assetCategory.findMany: count =", categories.length);
  } catch (err: any) {
    console.error("✗ Q11 prisma.assetCategory.findMany FAILED:\n", err);
  }

  // Query 12: auditLog findMany
  try {
    const recentActivities = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: {
          select: {
            name: true,
          }
        }
      }
    });
    console.log("✓ Q12 prisma.auditLog.findMany: count =", recentActivities.length);
  } catch (err: any) {
    console.error("✗ Q12 prisma.auditLog.findMany FAILED:\n", err);
  }

  // Query 13: activeAssets findMany
  try {
    const activeAssets = await prisma.asset.findMany({
      where: { status: AssetStatus.ACTIVE, deletedAt: null },
      select: {
        id: true,
        name: true,
        assetCode: true,
      },
      orderBy: { name: "asc" }
    });
    console.log("✓ Q13 prisma.asset.findMany (activeAssets): count =", activeAssets.length);
  } catch (err: any) {
    console.error("✗ Q13 prisma.asset.findMany (activeAssets) FAILED:\n", err);
  }

  // Query 14: staffUsers findMany
  try {
    const staffUsers = await prisma.user.findMany({
      where: {
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        department: { select: { name: true } }
      },
      orderBy: { name: "asc" }
    });
    console.log("✓ Q14 prisma.user.findMany (staffUsers): count =", staffUsers.length);
  } catch (err: any) {
    console.error("✗ Q14 prisma.user.findMany (staffUsers) FAILED:\n", err);
  }

  // Query 15: departments findMany
  try {
    const departments = await prisma.organizationalUnit.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: { name: "asc" }
    });
    console.log("✓ Q15 prisma.organizationalUnit.findMany: count =", departments.length);
  } catch (err: any) {
    console.error("✗ Q15 prisma.organizationalUnit.findMany FAILED:\n", err);
  }

  // Check tables in Neon
  console.log("\n--- Checking database tables in Neon ---");
  const tables: any = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Existing tables in public schema:", tables.rows.map((r: any) => r.table_name));

  // Check enums in Neon
  console.log("\n--- Checking enum types in Neon ---");
  const enums: any = await pool.query(
    "SELECT t.typname FROM pg_type t JOIN pg_namespace n ON 1=1 WHERE t.typnamespace = n.oid AND n.nspname = 'public' AND t.typtype = 'e'"
  );
  console.log("Existing enums in public schema:", enums.rows.map((r: any) => r.typname));
}

main()
  .catch((e) => console.error("Script error:", e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
