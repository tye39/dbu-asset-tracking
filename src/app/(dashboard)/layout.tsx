import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isInventoryPerson = await prisma.inventoryPerson.findUnique({
    where: { userId: session.user.id, isActive: true }
  });

  const user = {
    id: session.user.id,
    name: session.user.name || "Default User",
    email: session.user.email || "user@dbu.edu.et",
    role: session.user.role,
    departmentName: session.user.departmentName,
    isInventoryPerson: !!isInventoryPerson,
  };

  // Fetch pending assignments for this authenticated user
  const pendingAssignments = await prisma.assignment.findMany({
    where: {
      assignedToUserId: session.user.id,
      status: "PENDING_ACCEPTANCE",
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

  return (
    <DashboardShell user={user} pendingList={pendingList}>
      {children}
    </DashboardShell>
  );
}
