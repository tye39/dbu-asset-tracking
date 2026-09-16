import React from "react";
import { prisma } from "@/lib/db";
import { TechDashboardClient } from "@/components/tech-dashboard-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MaintenanceStatus } from "@prisma/client";

export const revalidate = 0;

export default async function TechDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 1. Fetch Stats
  const [openTasks, inProgressTasks, completedThisMonth] = await Promise.all([
    prisma.maintenance.count({ where: { status: MaintenanceStatus.PENDING } }),
    prisma.maintenance.count({ where: { status: MaintenanceStatus.IN_PROGRESS } }),
    prisma.maintenance.count({
      where: {
        status: MaintenanceStatus.COMPLETED,
        completedAt: { gte: startOfMonth },
      },
    }),
  ]);

  // 2. Fetch Chart Data
  const statuses = [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.COMPLETED];
  const chartData = await Promise.all(
    statuses.map(async (status) => {
      const count = await prisma.maintenance.count({ where: { status } });
      return { status, count };
    })
  );

  // 3. Fetch My Assigned / Active Tasks
  const rawTasks = await prisma.maintenance.findMany({
    where: {
      NOT: { status: MaintenanceStatus.COMPLETED },
    },
    include: {
      asset: true,
      reportedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const myTasks = rawTasks.map((t) => ({
    ...t,
    cost: t.cost ? Number(t.cost) : null,
  }));

  return (
    <TechDashboardClient
      stats={{
        openTasks,
        inProgressTasks,
        completedThisMonth,
      }}
      chartData={chartData}
      myTasks={myTasks}
    />
  );
}
