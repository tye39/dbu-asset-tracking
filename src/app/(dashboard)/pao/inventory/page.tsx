import React from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getActiveSessions, getCompletedSessions } from "@/services/inventory";
import { InventoryListClient } from "@/components/inventory-list-client";
import { InventoryPersonDashboardClient } from "@/components/inventory-person-dashboard-client";

export const revalidate = 0;

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = session.user.role;

  // Check if they are a registered active Inventory Person
  const isPAOOrAdmin = role === "PROPERTY_ADMINISTRATION_OFFICER" || role === "SYSTEM_ADMINISTRATOR";

  if (!isPAOOrAdmin) {
    redirect("/inventory");
  }

  // 2. If PAO/Admin, render the operational management dashboard
  const [departments, activeSessions, completedSessions, activePersons] = await Promise.all([
    prisma.organizationalUnit.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" }
    }),
    getActiveSessions(),
    getCompletedSessions(),
    prisma.inventoryPerson.findMany({
      where: { isActive: true },
      include: { user: true },
      orderBy: { user: { name: "asc" } }
    })
  ]);

  // Format serializable sessions
  const serializableActive = activeSessions.map(s => ({
    id: s.id,
    sessionNumber: s.sessionNumber,
    notes: s.notes || "",
    status: s.status,
    startDate: s.startDate.toISOString(),
    dueDate: s.dueDate.toISOString(),
    department: { name: s.department.name },
    inventoryPerson: { name: s.inventoryPerson.user.name },
    assignedBy: { name: s.assignedBy.name }
  }));

  const serializableCompleted = completedSessions.map(s => ({
    id: s.id,
    sessionNumber: s.sessionNumber,
    notes: s.notes || "",
    status: s.status,
    startDate: s.startDate.toISOString(),
    dueDate: s.dueDate.toISOString(),
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    department: { name: s.department.name },
    inventoryPerson: { name: s.inventoryPerson.user.name },
    assignedBy: { name: s.assignedBy.name },
    completedBy: s.completedBy ? { name: s.completedBy.name } : null
  }));

  const serializablePersons = activePersons.map(p => ({
    id: p.id,
    name: p.user.name,
    email: p.user.email
  }));

  return (
    <InventoryListClient
      departments={departments}
      activeSessions={serializableActive}
      completedSessions={serializableCompleted}
      inventoryPersons={serializablePersons}
    />
  );
}
