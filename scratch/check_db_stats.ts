import { prisma } from "../src/lib/db";

async function check() {
  const [
    totalAssets,
    availableAssets,
    assignedAssets,
    underMaintenance,
    pendingTransfers,
    disposedAssets,
    pendingMaintenances,
    totalCategories,
    pendingAssetRequests,
    pendingAppeals,
  ] = await Promise.all([
    prisma.asset.count({ where: { deletedAt: null } }),
    prisma.asset.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.asset.count({ where: { status: "ASSIGNED", deletedAt: null } }),
    prisma.asset.count({ where: { status: "UNDER_MAINTENANCE", deletedAt: null } }),
    prisma.transfer.count({ where: { status: "PENDING" } }),
    prisma.asset.count({ where: { status: "DISPOSED", deletedAt: null } }),
    prisma.maintenance.count({ where: { status: "PENDING" } }),
    prisma.assetCategory.count({ where: { deletedAt: null } }),
    prisma.assetRequest.count({
      where: { status: "APPROVED_BY_DEPARTMENT_HEAD" },
    }),
    prisma.propertyAppeal.count({
      where: {
        status: {
          in: [
            "PENDING_PROPERTY_MANAGEMENT",
            "UNDER_REVIEW",
            "ADDITIONAL_INFORMATION_REQUIRED",
          ],
        },
      },
    }),
  ]);

  console.log("LIVE DB STATS:", {
    totalAssets,
    availableAssets,
    assignedAssets,
    underMaintenance,
    pendingTransfers,
    disposedAssets,
    pendingMaintenances,
    totalCategories,
    pendingAssetRequests,
    pendingAppeals,
  });
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
