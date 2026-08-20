import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import { AssetStatus, AssignmentStatus } from "@prisma/client";

export async function disposeAsset(data: {
  assetId: string;
  reason: string;
  method: string;
  notes?: string;
}, actorId: string) {
  // Fetch asset and verify
  const asset = await prisma.asset.findUnique({
    where: { id: data.assetId },
  });

  if (!asset || asset.deletedAt) {
    throw new Error("Asset not found.");
  }

  if (asset.status === AssetStatus.DISPOSED) {
    throw new Error("This asset is already disposed.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Terminate any active assignments
    const activeAssignments = await tx.assignment.findMany({
      where: {
        assetId: data.assetId,
        status: { in: [AssignmentStatus.ACTIVE, AssignmentStatus.ACCEPTED, AssignmentStatus.PENDING_ACCEPTANCE, AssignmentStatus.RETURN_REQUESTED] }
      },
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

    // 2. Create Disposal record
    const disposal = await tx.disposal.create({
      data: {
        assetId: data.assetId,
        disposedById: actorId,
        reason: data.reason,
        method: data.method,
        notes: data.notes || null,
      },
    });

    // 3. Update asset status to DISPOSED
    await tx.asset.update({
      where: { id: data.assetId },
      data: { status: AssetStatus.DISPOSED },
    });

    return disposal;
  });

  await createAuditLog(
    actorId,
    "DISPOSE",
    "Asset",
    data.assetId,
    { status: asset.status },
    { status: AssetStatus.DISPOSED, disposalId: result.id }
  );

  return result;
}

export async function getDisposedAssets() {
  return await prisma.disposal.findMany({
    include: {
      asset: { include: { category: true, department: true } },
      disposedBy: true,
    },
    orderBy: { disposalDate: "desc" },
  });
}
