import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import { createNotification } from "./notification";
import { AssetStatus, Prisma, MaintenanceStatus, MaintenancePriority } from "@prisma/client";

export async function createMaintenanceRequest(data: {
  assetId: string;
  description: string;
  priority?: MaintenancePriority;
}, actorId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: data.assetId },
  });

  if (!asset || asset.deletedAt) {
    throw new Error("Asset not found.");
  }

  if (asset.status === AssetStatus.DISPOSED) {
    throw new Error("Cannot request maintenance for disposed assets.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create maintenance request
    const request = await tx.maintenance.create({
      data: {
        assetId: data.assetId,
        reportedById: actorId,
        description: data.description,
        priority: data.priority || MaintenancePriority.MEDIUM,
        status: MaintenanceStatus.PENDING,
      },
      include: { asset: true, reportedBy: true },
    });

    // 2. Mark asset status as UNDER_MAINTENANCE
    await tx.asset.update({
      where: { id: data.assetId },
      data: { status: AssetStatus.UNDER_MAINTENANCE },
    });

    return request;
  });

  await createAuditLog(
    actorId,
    "MAINTENANCE_REQUEST",
    "Asset",
    data.assetId,
    { status: asset.status },
    { status: AssetStatus.UNDER_MAINTENANCE, maintenanceId: result.id }
  );

  // Notify Technicians
  const techs = await prisma.user.findMany({
    where: {
      role: { name: "MAINTENANCE_TECHNICIAN" },
      deletedAt: null,
    },
  });

  for (const tech of techs) {
    await createNotification(
      tech.id,
      "New Maintenance Request",
      `Asset '${result.asset.name}' was reported for maintenance: '${data.description.slice(0, 50)}...'`
    );
  }

  return result;
}

export async function updateMaintenanceStatus(id: string, data: {
  status: MaintenanceStatus;
  assignedToId?: string; // Technician
  cost?: number;
  notes?: string;
}, actorId: string) {
  const maintenance = await prisma.maintenance.findUnique({
    where: { id },
    include: { asset: true },
  });

  if (!maintenance) throw new Error("Maintenance record not found.");

  const isCompleting = data.status === MaintenanceStatus.COMPLETED;
  const targetAssetStatus = isCompleting ? AssetStatus.ACTIVE : AssetStatus.UNDER_MAINTENANCE;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update maintenance request
    const updated = await tx.maintenance.update({
      where: { id },
      data: {
        status: data.status,
        assignedToId: data.assignedToId || maintenance.assignedToId,
        cost: data.cost ? data.cost : undefined,
        notes: data.notes || undefined,
        completedAt: isCompleting ? new Date() : undefined,
      },
    });

    // 2. Update asset status
    await tx.asset.update({
      where: { id: maintenance.assetId },
      data: { status: targetAssetStatus },
    });

    return updated;
  });

  await createAuditLog(
    actorId,
    `MAINTENANCE_${data.status}`,
    "Asset",
    maintenance.assetId,
    { maintenanceStatus: maintenance.status, assetStatus: maintenance.asset.status },
    { maintenanceStatus: data.status, assetStatus: targetAssetStatus }
  );

  // Notify reporter on status change
  await createNotification(
    maintenance.reportedById,
    `Maintenance Request ${data.status}`,
    `The maintenance request for '${maintenance.asset.name}' is now ${data.status.toLowerCase().replace("_", " ")}.`
  );

  return result;
}

export async function getMaintenanceRequests(filters: {
  status?: MaintenanceStatus;
  technicianId?: string;
}) {
  const where: Prisma.MaintenanceWhereInput = {};
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.technicianId) {
    where.assignedToId = filters.technicianId;
  }

  return await prisma.maintenance.findMany({
    where,
    include: {
      asset: { include: { category: true, department: true } },
      reportedBy: true,
      assignedTo: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
