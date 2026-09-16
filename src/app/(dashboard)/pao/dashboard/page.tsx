import React from "react";
import { prisma } from "@/lib/db";
import { PaoDashboardClient } from "@/components/pao-dashboard-client";
import { AssetStatus, TransferStatus, MaintenanceStatus } from "@prisma/client";

export const revalidate = 0; // Disable caching to ensure real-time dashboard data

export default async function PaoDashboardPage() {
  // 1. Fetch Stats
  const [
    totalAssets,
    availableAssets,
    assignedAssets,
    underMaintenance,
    pendingTransfers,
    disposedAssets,
    pendingMaintenances,
    totalCategories,
  ] = await Promise.all([
    prisma.asset.count({ where: { deletedAt: null } }),
    prisma.asset.count({ where: { status: AssetStatus.ACTIVE, deletedAt: null } }),
    prisma.asset.count({ where: { status: AssetStatus.ASSIGNED, deletedAt: null } }),
    prisma.asset.count({ where: { status: AssetStatus.UNDER_MAINTENANCE, deletedAt: null } }),
    prisma.transfer.count({ where: { status: TransferStatus.PENDING } }),
    prisma.asset.count({ where: { status: AssetStatus.DISPOSED, deletedAt: null } }),
    prisma.maintenance.count({ where: { status: MaintenanceStatus.PENDING } }),
    prisma.assetCategory.count({ where: { deletedAt: null } }),
  ]);

  // 2. Fetch Chart Data (Assets by Category)
  const categories = await prisma.assetCategory.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { assets: { where: { deletedAt: null } } }
      }
    }
  });

  const chartData = categories.map(cat => ({
    category: cat.name,
    count: cat._count.assets
  }));

  // 3. Fetch Recent Activity Audit Logs
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

  // 4. Fetch lists needed for interactive modals
  const activeAssets = await prisma.asset.findMany({
    where: { status: AssetStatus.ACTIVE, deletedAt: null },
    select: {
      id: true,
      name: true,
      assetCode: true,
    },
    orderBy: { name: "asc" }
  });

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

  const departments = await prisma.organizationalUnit.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      code: true
    },
    orderBy: { name: "asc" }
  });

  return (
    <PaoDashboardClient
      stats={{
        totalAssets,
        availableAssets,
        assignedAssets,
        underMaintenance,
        pendingTransfers,
        disposedAssets,
        pendingMaintenances,
        totalCategories,
      }}
      chartData={chartData}
      recentActivities={recentActivities}
      activeAssets={activeAssets}
      staffUsers={staffUsers}
      departments={departments}
    />
  );
}
