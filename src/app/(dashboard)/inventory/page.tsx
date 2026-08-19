import React from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InventoryPersonDashboardClient } from "@/components/inventory-person-dashboard-client";

export const revalidate = 0;

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "INVENTORY_PERSON" && role !== "SYSTEM_ADMINISTRATOR" && role !== "PROPERTY_ADMINISTRATION_OFFICER") {
    return (
      <div className="p-8 text-center text-red-655 font-bold">
        Permission denied. Only designated Inventory Persons can access this dashboard.
      </div>
    );
  }

  // Find active profile
  const inventoryPersonProfile = await prisma.inventoryPerson.findFirst({
    where: { user: { id: session.user.id }, isActive: true }
  });

  if (!inventoryPersonProfile) {
    return (
      <div className="p-8 text-center text-red-655 font-bold">
        Designated Inventory Person profile is currently inactive or not found.
      </div>
    );
  }

  const assignments = await prisma.inventorySession.findMany({
    where: { inventoryPersonId: inventoryPersonProfile.id },
    include: {
      department: true,
      assignedBy: true,
      verifications: true
    },
    orderBy: { createdAt: "desc" }
  });

  const serializableAssignments = await Promise.all(
    assignments.map(async (a) => {
      const totalAssets = await prisma.asset.count({
        where: { departmentId: a.departmentId, deletedAt: null }
      });
      return {
        id: a.id,
        sessionNumber: a.sessionNumber,
        notes: a.notes || "",
        status: a.status,
        startDate: a.startDate.toISOString(),
        dueDate: a.dueDate.toISOString(),
        departmentName: a.department.name,
        assignedBy: a.assignedBy.name,
        totalAssets,
        verifiedAssets: a.verifications.length,
        remainingAssets: Math.max(0, totalAssets - a.verifications.length),
        progress: totalAssets > 0 ? Number(((a.verifications.length / totalAssets) * 100).toFixed(1)) : 0
      };
    })
  );

  return (
    <InventoryPersonDashboardClient
      assignments={serializableAssignments}
    />
  );
}
