import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import { createNotification } from "./notification";
import { AssetStatus, AssignmentStatus } from "@prisma/client";

export async function assignAsset(data: {
  assetId: string;
  assignedToId?: string; // Optional: can assign to department only
  departmentId?: string; // Optional: can assign to staff only
  notes?: string;
}, actorId: string) {
  if (!data.assignedToId && !data.departmentId) {
    throw new Error("Must assign to either a user or a department.");
  }

  // Fetch asset and verify status
  const asset = await prisma.asset.findUnique({
    where: { id: data.assetId },
  });

  if (!asset || asset.deletedAt) {
    throw new Error("Asset not found.");
  }

  // Rule verification
  if (asset.status === AssetStatus.ASSIGNED) {
    throw new Error("Assets cannot be assigned twice while already assigned.");
  }
  if (asset.status === AssetStatus.DISPOSED) {
    throw new Error("Disposed assets cannot be transferred or assigned.");
  }
  if (asset.status === AssetStatus.UNDER_MAINTENANCE) {
    throw new Error("Assets under maintenance cannot be reassigned.");
  }

  // Update in a transaction
  const assignment = await prisma.$transaction(async (tx) => {
    // 1. Create assignment record
    const newAssignment = await tx.assignment.create({
      data: {
        assetId: data.assetId,
        assignedToId: data.assignedToId || null,
        departmentId: data.departmentId || null,
        assignedById: actorId,
        status: AssignmentStatus.ACTIVE,
        notes: data.notes || null,
      },
      include: {
        assignedTo: true,
        department: true,
        asset: true,
      },
    });

    // 2. Update asset status to ASSIGNED
    await tx.asset.update({
      where: { id: data.assetId },
      data: { status: AssetStatus.ASSIGNED },
    });

    return newAssignment;
  });

  // 3. Create Audit Log
  await createAuditLog(
    actorId,
    "ASSIGN",
    "Asset",
    data.assetId,
    { status: asset.status },
    { status: AssetStatus.ASSIGNED, assignmentId: assignment.id }
  );

  // 4. Send Notification if assigned to a user
  if (data.assignedToId) {
    await createNotification(
      data.assignedToId,
      "Asset Assigned to You",
      `The asset '${assignment.asset.name}' (${assignment.asset.assetCode}) has been assigned to you.`
    );
  }

  // 5. Send Notification if assigned to department (to Department Head)
  if (data.departmentId) {
    const deptHead = await prisma.user.findFirst({
      where: {
        departmentId: data.departmentId,
        role: { name: "DEPARTMENT_HEAD" },
        deletedAt: null,
      },
    });
    if (deptHead) {
      await createNotification(
        deptHead.id,
        "Asset Assigned to Department",
        `A new asset '${assignment.asset.name}' (${assignment.asset.assetCode}) has been assigned to your department.`
      );
    }
  }

  return assignment;
}

export async function getActiveAssignments() {
  return await prisma.assignment.findMany({
    where: { status: AssignmentStatus.ACTIVE },
    include: {
      asset: true,
      assignedTo: true,
      department: true,
      assignedBy: true,
    },
  });
}
