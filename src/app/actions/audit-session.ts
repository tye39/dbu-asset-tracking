"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { AuditSessionStatus, AuditItemStatus, ReturnCondition } from "@prisma/client";

/**
 * Creates a new physical audit verification session.
 * Automatically generates pending audit items for all active/assigned/maintenance assets in the system.
 */
export async function createAuditSessionAction(prevState: unknown, title: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const activeAssets = await prisma.asset.findMany({
      where: {
        status: { in: ["ACTIVE", "ASSIGNED", "UNDER_MAINTENANCE"] },
        deletedAt: null,
      },
      select: { id: true },
    });

    const auditSession = await prisma.$transaction(async (tx) => {
      const newSession = await tx.auditSession.create({
        data: {
          title,
          status: AuditSessionStatus.IN_PROGRESS,
          auditorId: session.user.id!,
        },
      });

      if (activeAssets.length > 0) {
        await tx.auditSessionItem.createMany({
          data: activeAssets.map((asset) => ({
            auditSessionId: newSession.id,
            assetId: asset.id,
            status: AuditItemStatus.PENDING,
            physicalCondition: ReturnCondition.GOOD,
          })),
        });
      }

      return newSession;
    });

    // Create system log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "AUDIT_START",
        entityType: "AuditSession",
        entityId: auditSession.id,
        newState: { title, itemsCount: activeAssets.length },
      },
    });

    revalidatePath("/", "layout");
    return { success: true, auditSessionId: auditSession.id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to start audit session.";
    return { error: msg };
  }
}

/**
 * Scans and verifies a physical asset code during an active audit session.
 */
export async function scanPhysicalAssetAction(
  prevState: unknown,
  data: {
    auditSessionId: string;
    assetCode: string;
    physicalCondition: ReturnCondition;
    notes?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    // 1. Find asset
    const asset = await prisma.asset.findUnique({
      where: { assetCode: data.assetCode },
      select: { id: true, name: true, status: true },
    });

    if (!asset) {
      return { error: `Asset with code "${data.assetCode}" was not found in system records.` };
    }

    // 2. Find audit item
    const auditItem = await prisma.auditSessionItem.findFirst({
      where: {
        auditSessionId: data.auditSessionId,
        assetId: asset.id,
      },
    });

    if (!auditItem) {
      return { error: "This asset is not part of the active audit session scope." };
    }

    // Determine status (discrepancy if reported broken/damaged, or if system status doesn't match physical)
    let auditStatus: AuditItemStatus = AuditItemStatus.MATCHED;
    if (data.physicalCondition === ReturnCondition.DAMAGED && asset.status !== "UNDER_MAINTENANCE") {
      auditStatus = AuditItemStatus.DISCREPANCY;
    }

    // 3. Update audit item
    await prisma.auditSessionItem.update({
      where: { id: auditItem.id },
      data: {
        status: auditStatus,
        physicalCondition: data.physicalCondition,
        scannedAt: new Date(),
        notes: data.notes || null,
      },
    });

    // Create system log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        assetId: asset.id,
        action: "AUDIT_SCAN",
        entityType: "AuditSessionItem",
        entityId: auditItem.id,
        newState: { condition: data.physicalCondition, status: auditStatus },
      },
    });

    revalidatePath("/", "layout");
    return { success: true, assetName: asset.name, status: auditStatus };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record scan.";
    return { error: msg };
  }
}

/**
 * Manually marks an audit session item status (e.g. MISSING or DISCREPANCY).
 */
export async function updateAuditItemStatusAction(
  prevState: unknown,
  data: {
    itemId: string;
    status: AuditItemStatus;
    notes?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const updated = await prisma.auditSessionItem.update({
      where: { id: data.itemId },
      data: {
        status: data.status,
        notes: data.notes || null,
      },
      include: { asset: { select: { name: true } } },
    });

    // Create system log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        assetId: updated.assetId,
        action: `AUDIT_${data.status.toUpperCase()}`,
        entityType: "AuditSessionItem",
        entityId: updated.id,
        newState: { status: data.status, notes: data.notes },
      },
    });

    revalidatePath("/", "layout");
    return { success: true, assetName: updated.asset.name };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update item status.";
    return { error: msg };
  }
}

/**
 * Completes an active audit session.
 * Automatically marks all remaining unscanned "PENDING" items as "MISSING".
 */
export async function completeAuditSessionAction(prevState: unknown, auditSessionId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Mark session as completed
      await tx.auditSession.update({
        where: { id: auditSessionId },
        data: {
          status: AuditSessionStatus.COMPLETED,
          endDate: new Date(),
        },
      });

      // 2. Auto-mark remaining PENDING items as MISSING
      await tx.auditSessionItem.updateMany({
        where: {
          auditSessionId,
          status: AuditItemStatus.PENDING,
        },
        data: {
          status: AuditItemStatus.MISSING,
          notes: "Auto-flagged missing: not physically scanned during audit session.",
        },
      });
    });

    // Create system log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "AUDIT_COMPLETE",
        entityType: "AuditSession",
        entityId: auditSessionId,
      },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to complete audit session.";
    return { error: msg };
  }
}
