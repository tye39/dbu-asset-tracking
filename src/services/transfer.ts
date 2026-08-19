import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import { createNotification } from "./notification";
import { AssetStatus, TransferStatus, AssignmentStatus } from "@prisma/client";

export async function requestTransfer(data: {
  assetId: string;
  toDepartmentId?: string;
  toUserId?: string;
  notes?: string;
}, actorId: string) {
  if (!data.toDepartmentId && !data.toUserId) {
    throw new Error("Must specify a target department or user for transfer.");
  }

  // Fetch asset and verify
  const asset = await prisma.asset.findUnique({
    where: { id: data.assetId },
  });

  if (!asset || asset.deletedAt) {
    throw new Error("Asset not found.");
  }

  if (asset.status === AssetStatus.DISPOSED) {
    throw new Error("Disposed assets cannot be transferred or assigned.");
  }

  // Get current state
  const activeAssignment = await prisma.assignment.findFirst({
    where: { assetId: data.assetId, status: AssignmentStatus.ACTIVE },
  });

  const transfer = await prisma.transfer.create({
    data: {
      assetId: data.assetId,
      fromDepartmentId: activeAssignment?.departmentId || asset.departmentId,
      fromUserId: activeAssignment?.assignedToId || null,
      toDepartmentId: data.toDepartmentId || null,
      toUserId: data.toUserId || null,
      requestedById: actorId,
      status: TransferStatus.PENDING,
      notes: data.notes || null,
    },
    include: {
      asset: true,
      requestedBy: true,
    },
  });

  await createAuditLog(
    actorId,
    "TRANSFER_REQUEST",
    "Asset",
    data.assetId,
    null,
    { transferId: transfer.id }
  );

  // Notify Property Administration Officers (PAOs)
  const paos = await prisma.user.findMany({
    where: {
      role: { name: "PROPERTY_ADMINISTRATION_OFFICER" },
      deletedAt: null,
    },
  });

  for (const pao of paos) {
    await createNotification(
      pao.id,
      "New Transfer Request",
      `A transfer has been requested for asset '${transfer.asset.name}' by ${transfer.requestedBy.name}.`
    );
  }

  return transfer;
}

export async function approveTransfer(transferId: string, actorId: string) {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { asset: true, requestedBy: true },
  });

  if (!transfer) throw new Error("Transfer request not found");
  if (transfer.status !== TransferStatus.PENDING) {
    throw new Error("Transfer request has already been processed.");
  }

  if (transfer.asset.status === AssetStatus.DISPOSED) {
    throw new Error("Disposed assets cannot be transferred or assigned.");
  }

  // Process approval in a transaction
  const updatedTransfer = await prisma.$transaction(async (tx) => {
    // 1. Update transfer status
    const approved = await tx.transfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.APPROVED,
        approvedById: actorId,
      },
    });

    // 2. Find and complete previous active assignments
    const activeAssignments = await tx.assignment.findMany({
      where: { assetId: transfer.assetId, status: AssignmentStatus.ACTIVE },
    });

    for (const assignment of activeAssignments) {
      await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          status: AssignmentStatus.RETURNED,
          returnedAt: new Date(),
        },
      });
    }

    // 3. Create new assignment
    await tx.assignment.create({
      data: {
        assetId: transfer.assetId,
        assignedToId: transfer.toUserId || null,
        departmentId: transfer.toDepartmentId || null,
        assignedById: actorId,
        status: AssignmentStatus.ACTIVE,
        notes: `Created via transfer request approval. Original notes: ${transfer.notes || ""}`,
      },
    });

    // 4. Update the asset location (department)
    const newDeptId = transfer.toDepartmentId || transfer.asset.departmentId;
    await tx.asset.update({
      where: { id: transfer.assetId },
      data: {
        departmentId: newDeptId,
        status: AssetStatus.ASSIGNED,
      },
    });

    return approved;
  });

  await createAuditLog(
    actorId,
    "TRANSFER_APPROVE",
    "Asset",
    transfer.assetId,
    { status: transfer.asset.status },
    { status: AssetStatus.ASSIGNED, transferId }
  );

  // Send notifications
  // Notify requester
  await createNotification(
    transfer.requestedById,
    "Transfer Request Approved",
    `Your transfer request for asset '${transfer.asset.name}' was approved.`
  );

  // Notify recipient user if applicable
  if (transfer.toUserId) {
    await createNotification(
      transfer.toUserId,
      "Asset Transferred to You",
      `The asset '${transfer.asset.name}' has been transferred to you.`
    );
  }

  return updatedTransfer;
}

export async function rejectTransfer(transferId: string, actorId: string, reason?: string) {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: { asset: true },
  });

  if (!transfer) throw new Error("Transfer request not found");
  if (transfer.status !== TransferStatus.PENDING) {
    throw new Error("Transfer request has already been processed.");
  }

  const updatedTransfer = await prisma.transfer.update({
    where: { id: transferId },
    data: {
      status: TransferStatus.REJECTED,
      notes: reason ? `${transfer.notes || ""}\nRejected Reason: ${reason}` : transfer.notes,
    },
  });

  await createAuditLog(
    actorId,
    "TRANSFER_REJECT",
    "Asset",
    transfer.assetId,
    null,
    { transferId, reason }
  );

  await createNotification(
    transfer.requestedById,
    "Transfer Request Rejected",
    `Your transfer request for asset '${transfer.asset.name}' was rejected.`
  );

  return updatedTransfer;
}

export async function getPendingTransfers() {
  return await prisma.transfer.findMany({
    where: { status: TransferStatus.PENDING },
    include: {
      asset: true,
      requestedBy: true,
      fromDepartment: true,
      toDepartment: true,
      fromUser: true,
      toUser: true,
    },
  });
}
