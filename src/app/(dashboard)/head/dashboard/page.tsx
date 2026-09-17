import React from "react";
import { prisma } from "@/lib/db";
import { HeadDashboardClient } from "@/components/head-dashboard-client";
import { auth } from "@/auth";
import {
  AssetStatus,
  TransferStatus,
  RoleName,
  AssetRequestStatus,
  PropertyAppealStatus,
} from "@prisma/client";

export const revalidate = 0;

export default async function HeadDashboardPage() {
  const session = await auth();
  if (!session?.user?.departmentId) {
    // If somehow a department head doesn't have a department assigned, show empty or default to first
    const fallbackDept = await prisma.organizationalUnit.findFirst({ where: { deletedAt: null } });
    if (fallbackDept && session?.user) {
      session.user.departmentId = fallbackDept.id;
    } else {
      return (
        <div className="p-6 text-center text-xs text-red-500 font-semibold bg-red-50 rounded-xl border border-red-200">
          Error: You are not assigned to any faculty department. Contact System Administrator.
        </div>
      );
    }
  }

  const deptId = session.user.departmentId;

  // 1. Fetch Stats
  const [
    departmentAssets,
    pendingTransfers,
    staffWithAssets,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    openAppeals,
    resolvedAppeals,
  ] = await Promise.all([
    prisma.asset.count({ where: { departmentId: deptId, deletedAt: null } }),
    prisma.transfer.count({
      where: {
        status: TransferStatus.PENDING,
        OR: [
          { fromDepartmentId: deptId },
          { toDepartmentId: deptId }
        ]
      }
    }),
    prisma.user.count({
      where: {
        departmentId: deptId,
        role: { name: RoleName.STAFF_MEMBER },
        assignmentsTo: {
          some: { status: "ACTIVE" }
        },
        deletedAt: null
      }
    }),
    prisma.assetRequest.count({
      where: { departmentId: deptId, status: AssetRequestStatus.PENDING_DEPARTMENT_HEAD }
    }),
    prisma.assetRequest.count({
      where: { departmentId: deptId, status: { in: [AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD, AssetRequestStatus.FULFILLED] } }
    }),
    prisma.assetRequest.count({
      where: { departmentId: deptId, status: { in: [AssetRequestStatus.REJECTED_BY_DEPARTMENT_HEAD, AssetRequestStatus.REJECTED_BY_PROPERTY_MANAGEMENT] } }
    }),
    prisma.propertyAppeal.count({
      where: { departmentId: deptId, status: { in: [PropertyAppealStatus.PENDING_PROPERTY_MANAGEMENT, PropertyAppealStatus.UNDER_REVIEW, PropertyAppealStatus.ADDITIONAL_INFORMATION_REQUIRED] } }
    }),
    prisma.propertyAppeal.count({
      where: { departmentId: deptId, status: { in: [PropertyAppealStatus.RESOLVED, PropertyAppealStatus.CLOSED] } }
    }),
  ]);

  // 2. Fetch Chart Data (Assets by Status in this department)
  const statuses = [AssetStatus.ACTIVE, AssetStatus.ASSIGNED, AssetStatus.UNDER_MAINTENANCE, AssetStatus.DISPOSED];
  const chartData = await Promise.all(
    statuses.map(async (status) => {
      const count = await prisma.asset.count({
        where: { departmentId: deptId, status, deletedAt: null }
      });
      return { status, count };
    })
  );

  // 3. Fetch Recent Activities for department assets
  const recentActivities = await prisma.auditLog.findMany({
    where: {
      asset: {
        departmentId: deptId
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      user: { select: { name: true } },
      asset: { select: { name: true } }
    }
  });

  // 4. Fetch list of department assets for the transfer selection dropdown
  const departmentAssetsList = await prisma.asset.findMany({
    where: { departmentId: deptId, deletedAt: null, NOT: { status: AssetStatus.DISPOSED } },
    select: {
      id: true,
      name: true,
      assetCode: true,
      status: true
    },
    orderBy: { name: "asc" }
  });

  // 5. Fetch other departments for selection
  const departments = await prisma.organizationalUnit.findMany({
    where: { deletedAt: null, NOT: { id: deptId } },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });

  // 6. Fetch staff members for selection
  const staffUsers = await prisma.user.findMany({
    where: { role: { name: RoleName.STAFF_MEMBER }, deletedAt: null },
    select: { id: true, name: true, department: { select: { name: true } } },
    orderBy: { name: "asc" }
  });

  return (
    <HeadDashboardClient
      stats={{
        departmentAssets,
        pendingTransfers,
        staffWithAssets,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        openAppeals,
        resolvedAppeals,
      }}
      chartData={chartData}
      recentActivities={recentActivities}
      departmentAssetsList={departmentAssetsList}
      departments={departments}
      staffUsers={staffUsers}
    />
  );
}
