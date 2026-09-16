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

  // Verify that the staff member exists if provided
  if (data.assignedToId) {
    const userExists = await prisma.user.findFirst({
      where: { id: data.assignedToId, deletedAt: null }
    });
    if (!userExists) {
      throw new Error("The selected staff member could not be found.");
    }
  }

  // Fetch asset and verify status
  const asset = await prisma.asset.findUnique({
    where: { id: data.assetId },
  });

  if (!asset || asset.deletedAt) {
    throw new Error("The selected asset could not be found.");
  }

  // Rule verification
  if (asset.status === AssetStatus.ASSIGNED) {
    throw new Error("This asset is already actively assigned and cannot be assigned to another staff member.");
  }
  if (asset.status === AssetStatus.PENDING_ASSIGNMENT) {
    throw new Error("This asset already has a pending assignment awaiting staff confirmation.");
  }
  if (asset.status === AssetStatus.DISPOSED) {
    throw new Error("Disposed assets cannot be transferred or assigned.");
  }
  if (asset.status === AssetStatus.UNDER_MAINTENANCE) {
    throw new Error("Assets under maintenance cannot be reassigned.");
  }
  if (asset.status !== AssetStatus.ACTIVE) {
    throw new Error("This asset is not currently available for assignment.");
  }

  // Update in a transaction
  const assignment = await prisma.$transaction(async (tx) => {
    // 0. Double check in transaction to prevent concurrency issues
    const existingActive = await tx.assignment.findFirst({
      where: {
        assetId: data.assetId,
        status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED] }
      }
    });
    if (existingActive) {
      throw new Error("This asset is already actively assigned and cannot be assigned to another staff member.");
    }

    const existingPending = await tx.assignment.findFirst({
      where: {
        assetId: data.assetId,
        status: AssignmentStatus.PENDING_ACCEPTANCE
      }
    });
    if (existingPending) {
      throw new Error("This asset already has a pending assignment awaiting staff confirmation.");
    }

    // 1. Create assignment record
    const newAssignment = await tx.assignment.create({
      data: {
        assetId: data.assetId,
        assignedToUserId: data.assignedToId || null,
        departmentId: data.departmentId || null,
        assignedByUserId: actorId,
        status: data.assignedToId ? AssignmentStatus.PENDING_ACCEPTANCE : AssignmentStatus.ACTIVE,
        notes: data.notes || null,
      },
      include: {
        assignedTo: true,
        department: true,
        asset: true,
      },
    });

    // 2. Update asset status
    const nextAssetStatus = data.assignedToId ? AssetStatus.PENDING_ASSIGNMENT : AssetStatus.ASSIGNED;
    await tx.asset.update({
      where: { id: data.assetId },
      data: { status: nextAssetStatus },
    });

    return newAssignment;
  });

  // 3. Create Audit Log
  await createAuditLog(
    actorId,
    "ASSET_ASSIGNMENT_CREATED",
    "Assignment",
    assignment.id,
    null,
    {
      assetId: assignment.assetId,
      assignedToUserId: assignment.assignedToUserId,
      departmentId: assignment.departmentId,
      status: assignment.status,
    }
  );

  // 4. Send Notification if assigned to a user
  if (data.assignedToId) {
    await createNotification(
      data.assignedToId,
      "New Asset Assignment",
      `The Property Administration Office has assigned an asset to you.\n\nAsset:\n${assignment.asset.name}\n\nAsset Code:\n${assignment.asset.assetCode}\n\nPlease review and either accept or reject the assignment.`
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
    where: { status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED] } },
    include: {
      asset: true,
      assignedTo: true,
      department: true,
      assignedBy: true,
    },
  });
}

export async function acceptAssignment(assignmentId: string, userId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { asset: true, assignedTo: true }
  });

  if (!assignment) {
    throw new Error("Assignment record not found.");
  }
  if (assignment.assignedToUserId !== userId) {
    throw new Error("You are not authorized to process this assignment.");
  }
  if (assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE) {
    throw new Error("This assignment has already been processed. Please refresh the page.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.assignment.findUnique({ where: { id: assignmentId } });
    if (!fresh) {
      throw new Error("Assignment record not found.");
    }
    if (fresh.status !== AssignmentStatus.PENDING_ACCEPTANCE) {
      throw new Error("This assignment has already been processed. Please refresh the page.");
    }

    // 1. Update assignment status to ACCEPTED
    const updatedAssignment = await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.ACCEPTED,
        acceptedAt: new Date(),
        acceptedById: userId
      },
      include: { asset: true, assignedTo: true }
    });

    // 2. Update asset status to ASSIGNED
    await tx.asset.update({
      where: { id: assignment.assetId },
      data: { status: AssetStatus.ASSIGNED }
    });

    return updatedAssignment;
  });

  // 3. Create Audit Log
  await createAuditLog(
    userId,
    "ASSET_ASSIGNMENT_ACCEPTED",
    "Assignment",
    assignmentId,
    { status: AssignmentStatus.PENDING_ACCEPTANCE },
    { status: AssignmentStatus.ACCEPTED }
  );

  // 4. Notify PAO
  const paos = await prisma.user.findMany({
    where: { role: { name: "PROPERTY_ADMINISTRATION_OFFICER" } }
  });
  for (const pao of paos) {
    await createNotification(
      pao.id,
      "Asset Assignment Accepted",
      `${assignment.assignedTo?.name || "The staff member"} accepted the assignment of:\n\n${assignment.asset.name}\nAsset Code: ${assignment.asset.assetCode}`
    );
  }

  return updated;
}

export async function rejectAssignment(assignmentId: string, userId: string, reason: string) {
  if (!reason || reason.trim() === "") {
    throw new Error("Please provide a reason for rejecting this assignment.");
  }
  if (reason.length > 500) {
    throw new Error("Rejection reason cannot exceed 500 characters.");
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { asset: true, assignedTo: true }
  });

  if (!assignment) {
    throw new Error("Assignment record not found.");
  }
  if (assignment.assignedToUserId !== userId) {
    throw new Error("You are not authorized to process this assignment.");
  }
  if (assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE && assignment.status !== AssignmentStatus.ACCEPTED) {
    throw new Error("This assignment has already been processed. Please refresh the page.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.assignment.findUnique({ where: { id: assignmentId } });
    if (!fresh) {
      throw new Error("Assignment record not found.");
    }
    if (fresh.status !== AssignmentStatus.PENDING_ACCEPTANCE && fresh.status !== AssignmentStatus.ACCEPTED) {
      throw new Error("This assignment has already been processed. Please refresh the page.");
    }

    const isPending = fresh.status === AssignmentStatus.PENDING_ACCEPTANCE;
    const nextStatus = isPending ? AssignmentStatus.REJECTED : AssignmentStatus.RETURN_REQUESTED;

    // If declining a pending assignment, release the asset back to ACTIVE (AVAILABLE)
    if (isPending) {
      await tx.asset.update({
        where: { id: assignment.assetId },
        data: { status: AssetStatus.ACTIVE }
      });
    }

    return await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: nextStatus,
        rejectedAt: new Date(),
        rejectedById: userId,
        rejectionReason: reason
      },
      include: { asset: true, assignedTo: true }
    });
  });

  // Audit
  await createAuditLog(
    userId,
    "ASSET_ASSIGNMENT_REJECTED",
    "Assignment",
    assignmentId,
    { status: assignment.status },
    { status: updated.status, rejectionReason: reason }
  );

  // Notify PAO
  const paos = await prisma.user.findMany({
    where: { role: { name: "PROPERTY_ADMINISTRATION_OFFICER" } }
  });
  for (const pao of paos) {
    await createNotification(
      pao.id,
      "Asset Assignment Rejected",
      `${assignment.assignedTo?.name || "The staff member"} rejected:\n\n${assignment.asset.name}\nAsset Code: ${assignment.asset.assetCode}\n\nReason:\n${reason}`
    );
  }

  return updated;
}

export async function approveReturnRequest(assignmentId: string, actorId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { asset: true, assignedTo: true }
  });

  if (!assignment) {
    throw new Error("Assignment record not found.");
  }
  if (assignment.status !== AssignmentStatus.RETURN_REQUESTED && assignment.status !== AssignmentStatus.PENDING_ACCEPTANCE && assignment.status !== AssignmentStatus.ACCEPTED) {
    throw new Error("Only pending, accepted, or return-requested assignments can be approved for return.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Mark assignment as RETURNED
    await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.RETURNED,
        returnedAt: new Date()
      }
    });

    // 2. Set asset status back to ACTIVE
    await tx.asset.update({
      where: { id: assignment.assetId },
      data: { status: "ACTIVE" }
    });
  });

  // Audit
  await createAuditLog(
    actorId,
    "RETURN_APPROVE",
    "Assignment",
    assignmentId,
    { status: assignment.status },
    { status: AssignmentStatus.RETURNED }
  );

  // Notify assignee
  if (assignment.assignedToUserId) {
    await createNotification(
      assignment.assignedToUserId,
      "Asset Assignment Return Approved",
      `The return/cancellation for asset '${assignment.asset.name}' has been approved by the Property Administrator.`
    );
  }
}

export async function cancelAssignment(assignmentId: string, actorId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { asset: true, assignedTo: true }
  });

  if (!assignment) {
    throw new Error("Assignment record not found.");
  }

  await prisma.$transaction(async (tx) => {
    // 1. Mark assignment as CANCELLED
    await tx.assignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.CANCELLED,
        returnedAt: new Date()
      }
    });

    // 2. Set asset status back to ACTIVE
    await tx.asset.update({
      where: { id: assignment.assetId },
      data: { status: AssetStatus.ACTIVE }
    });
  });

  // Audit
  await createAuditLog(
    actorId,
    "CANCEL",
    "Assignment",
    assignmentId,
    { status: assignment.status },
    { status: AssignmentStatus.CANCELLED }
  );
  // Notify assignee
  if (assignment.assignedToUserId) {
    await createNotification(
      assignment.assignedToUserId,
      "Asset Assignment Cancelled",
      `The assignment for asset '${assignment.asset.name}' has been cancelled by the Property Administrator.`
    );
  }
}
