import React from "react";
import { getInventorySessionDetails, getInventoryExpectedAssets } from "@/services/inventory";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { InventorySessionClient } from "@/components/inventory-session-client";

export const revalidate = 0;

interface SessionDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function SessionDetailsPage({ params }: SessionDetailsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const sDetails = await getInventorySessionDetails(params.id);
  if (!sDetails) {
    return (
      <div className="p-8 text-center text-red-650 font-bold">
        Inventory Session not found.
      </div>
    );
  }

  // RBAC permissions check
  const role = session.user.role;
  const isPAOOrAdmin = role === "PROPERTY_ADMINISTRATION_OFFICER" || role === "SYSTEM_ADMINISTRATOR";

  if (!isPAOOrAdmin) {
    redirect(`/inventory/${params.id}`);
  }

  // Fetch expected assets under this session's department
  const expectedAssets = await getInventoryExpectedAssets(sDetails.departmentId);

  // Format serializable session details
  const serializableSession = {
    id: sDetails.id,
    sessionNumber: sDetails.sessionNumber,
    notes: sDetails.notes || "",
    status: sDetails.status,
    startDate: sDetails.startDate.toISOString(),
    dueDate: sDetails.dueDate.toISOString(),
    completedAt: sDetails.completedAt ? sDetails.completedAt.toISOString() : null,
    department: { id: sDetails.departmentId, name: sDetails.department.name, code: sDetails.department.code },
    assignedBy: { name: sDetails.assignedBy.name },
    inventoryPerson: { id: sDetails.inventoryPerson.id, name: sDetails.inventoryPerson.user.name },
    completedBy: sDetails.completedBy ? { name: sDetails.completedBy.name } : null
  };

  // Format expected assets list
  const serializableExpected = expectedAssets.map(a => ({
    id: a.id,
    name: a.name,
    assetCode: a.assetCode,
    serialNumber: a.serialNumber,
    categoryName: a.category.name,
    typeName: a.assetType?.name || "N/A",
    status: a.status,
    imageUrl: a.images?.[0]?.url || null,
    assignedTo: a.assignments?.[0]?.assignedTo?.name || "Unassigned"
  }));

  // Format initial verified verifications
  const serializableVerifications = sDetails.verifications.map(v => ({
    id: v.id,
    assetId: v.assetId,
    scannedAt: v.scannedAt.toISOString(),
    scannedBy: { name: v.scannedBy.name },
    asset: {
      name: v.asset.name,
      assetCode: v.asset.assetCode,
      typeName: v.asset.assetType?.name || "N/A",
      categoryName: v.asset.category.name
    }
  }));

  return (
    <InventorySessionClient
      session={serializableSession}
      expectedAssets={serializableExpected}
      initialVerifications={serializableVerifications}
      isOperator={isPAOOrAdmin}
    />
  );
}
