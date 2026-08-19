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
  const [assignedAssets, openMaintenance] = await Promise.all([
    prisma.assignment.count({
      where: {
        assignedToId: userId,
        status: AssignmentStatus.ACTIVE,
      },
    }),
    prisma.maintenance.count({
      where: {
        reportedById: userId,
        NOT: { status: MaintenanceStatus.COMPLETED },
      },
    }),
  ]);

  // 2. Fetch My Assigned Assets List
  const activeAssignments = await prisma.assignment.findMany({
    where: {
      assignedToId: userId,
      status: AssignmentStatus.ACTIVE,
    },
    include: {
      asset: {
        include: {
          category: true,
        },
      },
    },
  });

  const myAssetsList = activeAssignments.map((a) => a.asset);

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
        openMaintenance,
      }}
      myAssetsList={myAssetsList}
      recentRequests={recentRequests}
    />
  );
}
