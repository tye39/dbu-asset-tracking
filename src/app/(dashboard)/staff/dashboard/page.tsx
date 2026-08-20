import React from "react";
import { prisma } from "@/lib/db";
import { StaffDashboardClient } from "@/components/staff-dashboard-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AssignmentStatus, MaintenanceStatus } from "@prisma/client";

export const revalidate = 0;

export default async function StaffDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  // 1. Fetch Stats
  const [assignedAssets, pendingCount, openMaintenance] = await Promise.all([
    prisma.assignment.count({
      where: {
        assignedToUserId: userId,
        status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED] },
      },
    }),
    prisma.assignment.count({
      where: {
        assignedToUserId: userId,
        status: AssignmentStatus.PENDING_ACCEPTANCE,
      },
    }),
    prisma.maintenance.count({
      where: {
        reportedById: userId,
        NOT: { status: MaintenanceStatus.COMPLETED },
      },
    }),
  ]);

  // 2. Fetch My Assigned Assignments List (Accepted/Active only)
  const assignmentsList = await prisma.assignment.findMany({
    where: {
      assignedToUserId: userId,
      status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED, AssignmentStatus.RETURN_REQUESTED] },
    },
    include: {
      asset: {
        include: {
          category: true,
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const myAssetsList = assignmentsList.map((a) => ({
    id: a.asset.id,
    assignmentId: a.id,
    name: a.asset.name,
    assetCode: a.asset.assetCode,
    serialNumber: a.asset.serialNumber,
    category: { name: a.asset.category.name },
    status: a.status,
  }));

  // 2.5 Fetch Pending Assignments
  const pendingAssignments = await prisma.assignment.findMany({
    where: {
      assignedToUserId: userId,
      status: AssignmentStatus.PENDING_ACCEPTANCE,
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

  const pendingList = pendingAssignments.map((pa) => ({
    id: pa.id,
    assignedAt: pa.assignedAt,
    assignedBy: pa.assignedBy?.name || "System",
    asset: {
      id: pa.asset.id,
      name: pa.asset.name,
      assetCode: pa.asset.assetCode,
      serialNumber: pa.asset.serialNumber,
      condition: pa.asset.condition || "N/A",
      category: pa.asset.category.name,
      assetTypeName: pa.asset.assetType?.name || "General",
      department: pa.asset.department.name,
    },
  }));

  // 3. Fetch Recent Requests (Maintenance) filed by this user
  const recentRequests = await prisma.maintenance.findMany({
    where: {
      reportedById: userId,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      asset: { select: { name: true } },
    },
  });

  return (
    <StaffDashboardClient
      stats={{
        assignedAssets,
        pendingAssignments: pendingCount,
        openMaintenance,
      }}
      myAssetsList={myAssetsList}
      pendingAssignments={pendingList}
      recentRequests={recentRequests}
    />
  );
}
