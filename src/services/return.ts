import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import { createNotification } from "./notification";
import { AssetStatus, AssignmentStatus, ReturnCondition, MaintenanceStatus, MaintenancePriority } from "@prisma/client";

export async function returnAsset(data: {
  assetId: string;
  conditionAtReturn: ReturnCondition;
  notes?: string;
}, actorId: string) {
  // Find current active assignment
  const activeAssignment = await prisma.assignment.findFirst({
    where: { assetId: data.assetId, status: AssignmentStatus.ACTIVE },
    include: { asset: true },
  });

  if (!activeAssignment) {
    throw new Error("No active assignment found for this asset.");
  }

  const isDamaged = data.conditionAtReturn === ReturnCondition.DAMAGED;
  const targetStatus = isDamaged ? AssetStatus.UNDER_MAINTENANCE : AssetStatus.ACTIVE;

  // Process return inside a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Mark assignment as RETURNED
    await tx.assignment.update({
      where: { id: activeAssignment.id },
      data: {
        status: AssignmentStatus.RETURNED,
        returnedAt: new Date(),
      },
    });

    // 2. Create the Return record
    const assetReturn = await tx.return.create({
      data: {
        assetId: data.assetId,
        assignmentId: activeAssignment.id,
        returnedById: activeAssignment.assignedToId || actorId, // original assignee or returner
        receivedById: actorId,
        conditionAtReturn: data.conditionAtReturn,
        isDamaged,
        notes: data.notes || null,
      },
    });

    // 3. Update asset status
    const updatedAsset = await tx.asset.update({
      where: { id: data.assetId },
      data: { status: targetStatus },
    });

    // 4. Create automatic maintenance request if damaged
    let maintenance = null;
    if (isDamaged) {
      maintenance = await tx.maintenance.create({
        data: {
          assetId: data.assetId,
          reportedById: actorId,
          description: `Auto-generated maintenance request: Asset returned in DAMAGED condition. Return notes: ${data.notes || "None"}`,
          status: MaintenanceStatus.PENDING,
          priority: MaintenancePriority.MEDIUM,
        },
      });
    }

    return { assetReturn, updatedAsset, maintenance };
  });

  await createAuditLog(
    actorId,
    "RETURN",
    "Asset",
    data.assetId,
    { status: activeAssignment.asset.status },
    { status: targetStatus, returnId: result.assetReturn.id, maintenanceId: result.maintenance?.id }
  );

  // If auto-maintenance was created, notify technicians
  if (isDamaged && result.maintenance) {
    const techs = await prisma.user.findMany({
      where: {
        role: { name: "MAINTENANCE_TECHNICIAN" },
        deletedAt: null,
      },
    });

    for (const tech of techs) {
      await createNotification(
        tech.id,
        "New Auto-Maintenance Request",
        `Asset '${activeAssignment.asset.name}' was returned damaged and requires maintenance.`
      );
    }
  }

  // Notify original assignee that the return has been registered
  if (activeAssignment.assignedToId) {
    await createNotification(
      activeAssignment.assignedToId,
      "Asset Return Registered",
      `The return of '${activeAssignment.asset.name}' has been successfully logged.`
    );
  }

  return result;
}
